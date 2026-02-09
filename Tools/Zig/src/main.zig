///! ESPHome Entity ID Retriever - Zig Implementation
///!
///! Connects to an ESPHome device via its Native API (port 6053) using Noise protocol
///! encryption (Noise_NNpsk0_25519_ChaChaPoly_SHA256), discovers all entities, and
///! optionally tests REST API endpoints.
///!
///! This is a complete Zig replacement for the Python get_ids.py tool.
const std = @import("std");
const net = std.net;
const crypto = std.crypto;
const mem = std.mem;

// ========== Noise Protocol Implementation ==========
// Implements Noise_NNpsk0_25519_ChaChaPoly_SHA256 from scratch using Zig stdlib.
//
// The NNpsk0 pattern:
//   pre-message:  (none)
//   message 1:    -> psk, e
//   message 2:    <- e, ee
//
// In PSK mode, every "e" token's MixHash(e.public_key) is followed by MixKey(e.public_key).
//
// After handshake, two CipherState objects are derived for sending/receiving.

const X25519 = crypto.dh.X25519;
const ChaCha20Poly1305 = crypto.aead.chacha_poly.ChaCha20Poly1305;
const Sha256 = crypto.hash.sha2.Sha256;
const HmacSha256 = crypto.auth.hmac.sha2.HmacSha256;

const HASHLEN: usize = 32;
const DHLEN: usize = 32;
const TAG_LEN: usize = 16;

const CipherState = struct {
    k: [32]u8,
    n: u64,
    has_key: bool,

    fn init() CipherState {
        return .{ .k = undefined, .n = 0, .has_key = false };
    }

    fn initKey(self: *CipherState, key: [32]u8) void {
        self.k = key;
        self.n = 0;
        self.has_key = true;
    }

    fn encryptWithAd(self: *CipherState, ad: []const u8, plaintext: []const u8, out: []u8) !usize {
        if (!self.has_key) {
            @memcpy(out[0..plaintext.len], plaintext);
            return plaintext.len;
        }

        var nonce: [12]u8 = .{0} ** 12;
        mem.writeInt(u64, nonce[4..12], self.n, .little);

        var tag: [TAG_LEN]u8 = undefined;
        ChaCha20Poly1305.encrypt(out[0..plaintext.len], &tag, plaintext, ad, nonce, self.k);
        @memcpy(out[plaintext.len..][0..TAG_LEN], &tag);
        self.n += 1;
        return plaintext.len + TAG_LEN;
    }

    fn decryptWithAd(self: *CipherState, ad: []const u8, ciphertext: []const u8, out: []u8) !usize {
        if (!self.has_key) {
            @memcpy(out[0..ciphertext.len], ciphertext);
            return ciphertext.len;
        }

        if (ciphertext.len < TAG_LEN) return error.MessageTooShort;

        const ct_len = ciphertext.len - TAG_LEN;
        var nonce: [12]u8 = .{0} ** 12;
        mem.writeInt(u64, nonce[4..12], self.n, .little);

        const tag = ciphertext[ct_len..][0..TAG_LEN];
        ChaCha20Poly1305.decrypt(out[0..ct_len], ciphertext[0..ct_len], tag.*, ad, nonce, self.k) catch {
            return error.DecryptionFailed;
        };
        self.n += 1;
        return ct_len;
    }
};

const SymmetricState = struct {
    cipher: CipherState,
    ck: [HASHLEN]u8,
    h: [HASHLEN]u8,

    fn initProtocol(protocol_name: []const u8) SymmetricState {
        var h: [HASHLEN]u8 = .{0} ** HASHLEN;
        if (protocol_name.len <= HASHLEN) {
            @memcpy(h[0..protocol_name.len], protocol_name);
        } else {
            Sha256.hash(protocol_name, &h, .{});
        }

        return .{
            .cipher = CipherState.init(),
            .ck = h,
            .h = h,
        };
    }

    fn mixKey(self: *SymmetricState, input_key_material: []const u8) void {
        var temp_k: [HASHLEN]u8 = undefined;
        hkdf2(&self.ck, &temp_k, &self.ck, input_key_material);
        self.cipher.initKey(temp_k);
    }

    fn mixHash(self: *SymmetricState, data: []const u8) void {
        var hasher = Sha256.init(.{});
        hasher.update(&self.h);
        hasher.update(data);
        hasher.final(&self.h);
    }

    fn mixKeyAndHash(self: *SymmetricState, input_key_material: []const u8) void {
        var temp_h: [HASHLEN]u8 = undefined;
        var temp_k: [HASHLEN]u8 = undefined;
        hkdf3(&self.ck, &temp_h, &temp_k, &self.ck, input_key_material);
        self.mixHash(&temp_h);
        self.cipher.initKey(temp_k);
    }

    fn encryptAndHash(self: *SymmetricState, plaintext: []const u8, out: []u8) !usize {
        const ct_len = try self.cipher.encryptWithAd(&self.h, plaintext, out);
        self.mixHash(out[0..ct_len]);
        return ct_len;
    }

    fn decryptAndHash(self: *SymmetricState, ciphertext: []const u8, out: []u8) !usize {
        const pt_len = try self.cipher.decryptWithAd(&self.h, ciphertext, out);
        self.mixHash(ciphertext);
        return pt_len;
    }

    fn split(self: *SymmetricState) struct { c1: CipherState, c2: CipherState } {
        var temp_k1: [HASHLEN]u8 = undefined;
        var temp_k2: [HASHLEN]u8 = undefined;
        hkdf2(&temp_k1, &temp_k2, &self.ck, &.{});

        var c1 = CipherState.init();
        c1.initKey(temp_k1);
        var c2 = CipherState.init();
        c2.initKey(temp_k2);

        return .{ .c1 = c1, .c2 = c2 };
    }
};

fn hkdf2(out1: *[HASHLEN]u8, out2: *[HASHLEN]u8, chaining_key: *const [HASHLEN]u8, input_key_material: []const u8) void {
    var temp_key: [HASHLEN]u8 = undefined;
    HmacSha256.create(&temp_key, input_key_material, chaining_key);

    var hmac1 = HmacSha256.init(&temp_key);
    hmac1.update(&[_]u8{0x01});
    hmac1.final(out1);

    var hmac2 = HmacSha256.init(&temp_key);
    hmac2.update(out1);
    hmac2.update(&[_]u8{0x02});
    hmac2.final(out2);
}

fn hkdf3(out1: *[HASHLEN]u8, out2: *[HASHLEN]u8, out3: *[HASHLEN]u8, chaining_key: *const [HASHLEN]u8, input_key_material: []const u8) void {
    var temp_key: [HASHLEN]u8 = undefined;
    HmacSha256.create(&temp_key, input_key_material, chaining_key);

    var hmac1 = HmacSha256.init(&temp_key);
    hmac1.update(&[_]u8{0x01});
    hmac1.final(out1);

    var hmac2 = HmacSha256.init(&temp_key);
    hmac2.update(out1);
    hmac2.update(&[_]u8{0x02});
    hmac2.final(out2);

    var hmac3 = HmacSha256.init(&temp_key);
    hmac3.update(out2);
    hmac3.update(&[_]u8{0x03});
    hmac3.final(out3);
}

// ========== ESPHome Noise Connection ==========

const NoiseConnection = struct {
    stream: net.Stream,
    send_cipher: CipherState,
    recv_cipher: CipherState,

    fn connect(host: []const u8, port: u16, encryption_key: []const u8) !NoiseConnection {
        var psk: [32]u8 = undefined;
        std.base64.standard.Decoder.decode(&psk, encryption_key) catch {
            return error.InvalidEncryptionKey;
        };

        const address = try net.Address.resolveIp(host, port);
        const stream = try net.tcpConnectToAddress(address);
        errdefer stream.close();

        const protocol_name = "Noise_NNpsk0_25519_ChaChaPoly_SHA256";
        var ss = SymmetricState.initProtocol(protocol_name);

        const prologue = "NoiseAPIInit\x00\x00";
        ss.mixHash(prologue);

        // === NNpsk0 Message 1: -> psk, e ===
        const e_keypair = X25519.KeyPair.generate();
        // Process psk token first: MixKeyAndHash(psk)
        ss.mixKeyAndHash(&psk);
        // Process e token: MixHash(e.public_key), then MixKey(e.public_key) for PSK mode
        ss.mixHash(&e_keypair.public_key);
        ss.mixKey(&e_keypair.public_key);

        var encrypted_payload: [TAG_LEN]u8 = undefined;
        const enc_len = try ss.encryptAndHash(&.{}, &encrypted_payload);

        const handshake_data_len = DHLEN + enc_len;
        const frame_payload_len: usize = 1 + handshake_data_len;
        var send_buf: [3 + 3 + 1 + DHLEN + TAG_LEN]u8 = undefined;
        send_buf[0] = 0x01;
        send_buf[1] = 0x00;
        send_buf[2] = 0x00;
        send_buf[3] = 0x01;
        send_buf[4] = @intCast((frame_payload_len >> 8) & 0xFF);
        send_buf[5] = @intCast(frame_payload_len & 0xFF);
        send_buf[6] = 0x00;
        @memcpy(send_buf[7..][0..DHLEN], &e_keypair.public_key);
        @memcpy(send_buf[7 + DHLEN ..][0..enc_len], encrypted_payload[0..enc_len]);

        try socketSendAll(stream.handle, &send_buf);

        // === Read ServerHello ===
        var header: [3]u8 = undefined;
        try readExact(stream.handle, &header);
        if (header[0] != 0x01) return error.InvalidNoiseMarker;

        const server_hello_len: usize = (@as(usize, header[1]) << 8) | @as(usize, header[2]);
        if (server_hello_len == 0 or server_hello_len > 256) return error.InvalidServerHello;

        var server_hello_buf: [256]u8 = undefined;
        try readExact(stream.handle, server_hello_buf[0..server_hello_len]);

        if (server_hello_buf[0] != 0x01) return error.UnsupportedProtocol;

        // === Read Handshake Response ===
        var header2: [3]u8 = undefined;
        try readExact(stream.handle, &header2);
        if (header2[0] != 0x01) return error.InvalidNoiseMarker;

        const hs_resp_len: usize = (@as(usize, header2[1]) << 8) | @as(usize, header2[2]);
        if (hs_resp_len == 0 or hs_resp_len > 512) return error.InvalidHandshakeResponse;

        var hs_resp_buf: [512]u8 = undefined;
        try readExact(stream.handle, hs_resp_buf[0..hs_resp_len]);

        if (hs_resp_buf[0] != 0x00) {
            return error.HandshakeFailed;
        }

        // Process NNpsk0 Message 2: <- e, ee
        const server_data = hs_resp_buf[1..hs_resp_len];
        if (server_data.len < DHLEN + TAG_LEN) return error.HandshakeResponseTooShort;

        var re: [DHLEN]u8 = undefined;
        @memcpy(&re, server_data[0..DHLEN]);
        // Process e token: MixHash(re), then MixKey(re) for PSK mode
        ss.mixHash(&re);
        ss.mixKey(&re);

        const dh_result = X25519.scalarmult(e_keypair.secret_key, re) catch {
            return error.DHFailed;
        };
        ss.mixKey(&dh_result);

        var decrypted: [64]u8 = undefined;
        _ = try ss.decryptAndHash(server_data[DHLEN..], &decrypted);

        const ciphers = ss.split();

        return .{
            .stream = stream,
            .send_cipher = ciphers.c1,
            .recv_cipher = ciphers.c2,
        };
    }

    fn close(self: *NoiseConnection) void {
        self.stream.close();
    }

    fn sendMessage(self: *NoiseConnection, msg_type: u16, data: []const u8) !void {
        const data_len = data.len;
        var plaintext_buf: [4 + 8192]u8 = undefined;
        plaintext_buf[0] = @intCast((msg_type >> 8) & 0xFF);
        plaintext_buf[1] = @intCast(msg_type & 0xFF);
        plaintext_buf[2] = @intCast((data_len >> 8) & 0xFF);
        plaintext_buf[3] = @intCast(data_len & 0xFF);
        if (data_len > 0) {
            @memcpy(plaintext_buf[4..][0..data_len], data);
        }
        const plaintext_len = 4 + data_len;

        var ciphertext: [4 + 8192 + TAG_LEN]u8 = undefined;
        const ct_len = try self.send_cipher.encryptWithAd(&.{}, plaintext_buf[0..plaintext_len], &ciphertext);

        var frame_buf: [3 + 4 + 8192 + TAG_LEN]u8 = undefined;
        frame_buf[0] = 0x01;
        frame_buf[1] = @intCast((ct_len >> 8) & 0xFF);
        frame_buf[2] = @intCast(ct_len & 0xFF);
        @memcpy(frame_buf[3..][0..ct_len], ciphertext[0..ct_len]);

        try socketSendAll(self.stream.handle, frame_buf[0 .. 3 + ct_len]);
    }

    fn recvMessage(self: *NoiseConnection, out_buf: []u8) !struct { msg_type: u16, data: []u8 } {
        var header: [3]u8 = undefined;
        try readExact(self.stream.handle, &header);
        if (header[0] != 0x01) return error.InvalidNoiseMarker;

        const frame_len: usize = (@as(usize, header[1]) << 8) | @as(usize, header[2]);
        if (frame_len == 0 or frame_len > 8192 + TAG_LEN + 4) return error.FrameTooLarge;

        var encrypted_buf: [8192 + TAG_LEN + 4]u8 = undefined;
        try readExact(self.stream.handle, encrypted_buf[0..frame_len]);

        const pt_len = try self.recv_cipher.decryptWithAd(&.{}, encrypted_buf[0..frame_len], out_buf);
        if (pt_len < 4) return error.MessageTooShort;

        const msg_type: u16 = (@as(u16, out_buf[0]) << 8) | @as(u16, out_buf[1]);
        return .{ .msg_type = msg_type, .data = out_buf[4..pt_len] };
    }
};

const windows = std.os.windows;

fn socketRecv(handle: net.Stream.Handle, buf: []u8) !usize {
    const rc = windows.ws2_32.recv(handle, buf.ptr, @intCast(buf.len), 0);
    if (rc == windows.ws2_32.SOCKET_ERROR) return error.RecvFailed;
    return @intCast(rc);
}

fn socketSendAll(handle: net.Stream.Handle, data: []const u8) !void {
    var total: usize = 0;
    while (total < data.len) {
        const remaining = data[total..];
        const rc = windows.ws2_32.send(handle, remaining.ptr, @intCast(remaining.len), 0);
        if (rc == windows.ws2_32.SOCKET_ERROR) return error.SendFailed;
        total += @as(usize, @intCast(rc));
    }
}

fn readExact(handle: net.Stream.Handle, buf: []u8) !void {
    var total: usize = 0;
    while (total < buf.len) {
        const n = try socketRecv(handle, buf[total..]);
        if (n == 0) return error.ConnectionClosed;
        total += n;
    }
}

// ========== Protobuf Helpers ==========

fn encodeVarint(value: u64, buf: []u8) usize {
    var v = value;
    var i: usize = 0;
    while (true) {
        var byte: u8 = @intCast(v & 0x7F);
        v >>= 7;
        if (v != 0) byte |= 0x80;
        buf[i] = byte;
        i += 1;
        if (v == 0) break;
    }
    return i;
}

fn decodeVarint(data: []const u8, pos: usize) struct { value: u64, new_pos: usize } {
    var result: u64 = 0;
    var shift: u6 = 0;
    var i = pos;
    while (i < data.len) {
        const byte = data[i];
        result |= @as(u64, byte & 0x7F) << shift;
        i += 1;
        if (byte & 0x80 == 0) break;
        shift +|= 7;
    }
    return .{ .value = result, .new_pos = i };
}

fn encodeStringField(field_num: u32, value: []const u8, buf: []u8) usize {
    if (value.len == 0) return 0;
    const tag: u64 = (@as(u64, field_num) << 3) | 2;
    var i = encodeVarint(tag, buf);
    i += encodeVarint(value.len, buf[i..]);
    @memcpy(buf[i..][0..value.len], value);
    return i + value.len;
}

fn encodeUint32Field(field_num: u32, value: u32, buf: []u8) usize {
    if (value == 0) return 0;
    const tag: u64 = (@as(u64, field_num) << 3) | 0;
    var i = encodeVarint(tag, buf);
    i += encodeVarint(value, buf[i..]);
    return i;
}

fn encodeFixed32Field(field_num: u32, value: u32, buf: []u8) usize {
    const tag: u64 = (@as(u64, field_num) << 3) | 5;
    const i = encodeVarint(tag, buf);
    mem.writeInt(u32, buf[i..][0..4], value, .little);
    return i + 4;
}

const ProtoField = struct {
    field_num: u32,
    wire_type: u8,
    varint_val: u64,
    string_val: []const u8,
    fixed32_val: u32,
};

const MAX_FIELDS = 32;

const ProtoFields = struct {
    fields: [MAX_FIELDS]ProtoField,
    count: usize,

    fn parse(data: []const u8) ProtoFields {
        var result = ProtoFields{
            .fields = undefined,
            .count = 0,
        };

        var pos: usize = 0;
        while (pos < data.len and result.count < MAX_FIELDS) {
            const tag_res = decodeVarint(data, pos);
            pos = tag_res.new_pos;
            const field_num: u32 = @intCast(tag_res.value >> 3);
            const wire_type: u8 = @intCast(tag_res.value & 7);

            var field = ProtoField{
                .field_num = field_num,
                .wire_type = wire_type,
                .varint_val = 0,
                .string_val = &.{},
                .fixed32_val = 0,
            };

            switch (wire_type) {
                0 => {
                    const val_res = decodeVarint(data, pos);
                    field.varint_val = val_res.value;
                    pos = val_res.new_pos;
                },
                1 => {
                    if (pos + 8 <= data.len) {
                        pos += 8;
                    } else break;
                },
                2 => {
                    const len_res = decodeVarint(data, pos);
                    pos = len_res.new_pos;
                    const length: usize = @intCast(len_res.value);
                    if (pos + length <= data.len) {
                        field.string_val = data[pos .. pos + length];
                        pos += length;
                    } else break;
                },
                5 => {
                    if (pos + 4 <= data.len) {
                        field.fixed32_val = mem.readInt(u32, data[pos..][0..4], .little);
                        pos += 4;
                    } else break;
                },
                else => break,
            }

            result.fields[result.count] = field;
            result.count += 1;
        }

        return result;
    }

    fn getString(self: *const ProtoFields, field_num: u32) []const u8 {
        for (self.fields[0..self.count]) |f| {
            if (f.field_num == field_num and f.wire_type == 2) return f.string_val;
        }
        return "";
    }

    fn getVarint(self: *const ProtoFields, field_num: u32) u64 {
        for (self.fields[0..self.count]) |f| {
            if (f.field_num == field_num and f.wire_type == 0) return f.varint_val;
        }
        return 0;
    }

    fn getFixed32(self: *const ProtoFields, field_num: u32) u32 {
        for (self.fields[0..self.count]) |f| {
            if (f.field_num == field_num and f.wire_type == 5) return f.fixed32_val;
        }
        return 0;
    }
};

// ========== ESPHome Message Encoding ==========

fn encodeHelloRequest(buf: []u8) usize {
    var len: usize = 0;
    len += encodeStringField(1, "esphome-get-ids 0.1.0", buf[len..]);
    len += encodeUint32Field(2, 1, buf[len..]);
    len += encodeUint32Field(3, 10, buf[len..]);
    return len;
}

fn encodeGetTimeResponse(buf: []u8) usize {
    const epoch: u32 = @intCast(@divFloor(std.time.timestamp(), 1));
    return encodeFixed32Field(1, epoch, buf);
}

// ========== Entity Types ==========

const EntityInfo = struct {
    object_id: []const u8,
    key: u32,
    name: []const u8,
    entity_type: []const u8,
    msg_type: u16,
};

fn msgTypeToEntityType(msg_type: u16) ?[]const u8 {
    return switch (msg_type) {
        12 => "Binary Sensor",
        13 => "Cover",
        14 => "Fan",
        15 => "Light",
        16 => "Sensor",
        17 => "Switch",
        18 => "Text Sensor",
        43 => "Camera",
        46 => "Climate",
        49 => "Number",
        52 => "Select",
        55 => "Siren",
        58 => "Lock",
        61 => "Button",
        63 => "Media Player",
        94 => "Alarm Control Panel",
        97 => "Text",
        100 => "Date",
        103 => "Time",
        107 => "Event",
        109 => "Valve",
        112 => "DateTime",
        116 => "Update",
        132 => "Water Heater",
        135 => "Infrared",
        else => null,
    };
}

fn entityTypeToRestPrefix(entity_type: []const u8) ?[]const u8 {
    const types = [_]struct { name: []const u8, prefix: []const u8 }{
        .{ .name = "Binary Sensor", .prefix = "binary_sensor" },
        .{ .name = "Sensor", .prefix = "sensor" },
        .{ .name = "Switch", .prefix = "switch" },
        .{ .name = "Button", .prefix = "button" },
        .{ .name = "Light", .prefix = "light" },
        .{ .name = "Fan", .prefix = "fan" },
        .{ .name = "Cover", .prefix = "cover" },
        .{ .name = "Climate", .prefix = "climate" },
        .{ .name = "Number", .prefix = "number" },
        .{ .name = "Select", .prefix = "select" },
        .{ .name = "Text Sensor", .prefix = "text_sensor" },
        .{ .name = "Lock", .prefix = "lock" },
        .{ .name = "Text", .prefix = "text" },
        .{ .name = "Date", .prefix = "date" },
        .{ .name = "Time", .prefix = "time" },
        .{ .name = "DateTime", .prefix = "datetime" },
        .{ .name = "Media Player", .prefix = "media_player" },
        .{ .name = "Camera", .prefix = "camera" },
        .{ .name = "Alarm Control Panel", .prefix = "alarm_control_panel" },
        .{ .name = "Valve", .prefix = "valve" },
        .{ .name = "Update", .prefix = "update" },
        .{ .name = "Water Heater", .prefix = "water_heater" },
        .{ .name = "Siren", .prefix = "siren" },
        .{ .name = "Event", .prefix = "event" },
        .{ .name = "Infrared", .prefix = "infrared" },
    };
    for (types) |t| {
        if (mem.eql(u8, entity_type, t.name)) return t.prefix;
    }
    return null;
}

fn entityActions(entity_type: []const u8) []const u8 {
    const types = [_]struct { name: []const u8, actions: []const u8 }{
        .{ .name = "Switch", .actions = "turn_on, turn_off, toggle" },
        .{ .name = "Light", .actions = "turn_on, turn_off, toggle" },
        .{ .name = "Fan", .actions = "turn_on, turn_off, toggle" },
        .{ .name = "Button", .actions = "press" },
        .{ .name = "Cover", .actions = "open, close, stop" },
        .{ .name = "Number", .actions = "set value" },
        .{ .name = "Select", .actions = "set option" },
        .{ .name = "Climate", .actions = "set temperature" },
        .{ .name = "Lock", .actions = "lock, unlock, open" },
        .{ .name = "Text", .actions = "set value" },
        .{ .name = "Date", .actions = "set date" },
        .{ .name = "Time", .actions = "set time" },
        .{ .name = "DateTime", .actions = "set datetime" },
        .{ .name = "Media Player", .actions = "play, pause, stop" },
        .{ .name = "Alarm Control Panel", .actions = "arm, disarm" },
        .{ .name = "Valve", .actions = "open, close" },
        .{ .name = "Siren", .actions = "turn_on, turn_off" },
    };
    for (types) |t| {
        if (mem.eql(u8, entity_type, t.name)) return t.actions;
    }
    return "";
}

fn entityHasPostEndpoint(entity_type: []const u8) bool {
    return entityActions(entity_type).len > 0;
}

// ========== Group Ordering ==========

const group_order = [_][]const u8{
    "Binary Sensor",       "Sensor",       "Switch",
    "Button",              "Light",        "Fan",
    "Cover",               "Climate",      "Number",
    "Select",              "Text Sensor",  "Lock",
    "Text",                "Date",         "Time",
    "DateTime",            "Media Player", "Camera",
    "Alarm Control Panel", "Event",        "Valve",
    "Update",              "Water Heater", "Siren",
    "Infrared",            "Other",
};

fn getGroupIndex(entity_type: []const u8) usize {
    for (group_order, 0..) |g, i| {
        if (mem.eql(u8, entity_type, g)) return i;
    }
    return group_order.len - 1;
}

// ========== Output Helper ==========

fn writeOut(file: std.fs.File, comptime fmt: []const u8, args: anytype) void {
    var buf: [4096]u8 = undefined;
    const s = std.fmt.bufPrint(&buf, fmt, args) catch {
        file.writeAll("(output truncated)\n") catch {};
        return;
    };
    file.writeAll(s) catch {};
}

// ========== Sorting context ==========

const SortCtx = struct {
    items: []const EntityInfo,
};

fn lessThanByName(ctx: SortCtx, a: usize, b: usize) bool {
    const ea = ctx.items[a];
    const eb = ctx.items[b];
    const name_cmp = mem.order(u8, ea.name, eb.name);
    if (name_cmp == .lt) return true;
    if (name_cmp == .gt) return false;
    return mem.order(u8, ea.object_id, eb.object_id) == .lt;
}

fn lessThanByOid(ctx: SortCtx, a: usize, b: usize) bool {
    return mem.order(u8, ctx.items[a].object_id, ctx.items[b].object_id) == .lt;
}

// ========== Main ==========

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    const stdout_file = std.fs.File.stdout();

    if (args.len < 2) {
        writeOut(stdout_file, "Usage: esphome-get-ids <host> [encryption_key] [password] [port] [--test] [--time]\n\n", .{});
        writeOut(stdout_file, "Examples:\n", .{});
        writeOut(stdout_file, "  esphome-get-ids 192.168.1.100\n", .{});
        writeOut(stdout_file, "  esphome-get-ids 192.168.1.100 'base64_encryption_key'\n", .{});
        writeOut(stdout_file, "  esphome-get-ids 192.168.1.100 'base64_encryption_key' '' 6053 --test\n\n", .{});
        writeOut(stdout_file, "  esphome-get-ids 192.168.1.100 'base64_encryption_key' '' 6053 --time\n\n", .{});
        writeOut(stdout_file, "Note: Encryption key is the API encryption key from ESPHome (noise_psk)\n", .{});
        writeOut(stdout_file, "      Add --test flag to test all GET endpoints\n", .{});
        writeOut(stdout_file, "      Add --time flag to time execution (summary output only)\n", .{});
        std.process.exit(1);
    }

    var test_endpoints = false;
    var timed = false;
    var filtered: std.ArrayList([]const u8) = .{};
    defer filtered.deinit(allocator);

    for (args[1..]) |arg| {
        if (mem.eql(u8, arg, "--test")) {
            test_endpoints = true;
        } else if (mem.eql(u8, arg, "--time")) {
            timed = true;
        } else {
            try filtered.append(allocator, arg);
        }
    }

    const host = filtered.items[0];
    const encryption_key: []const u8 = if (filtered.items.len > 1) filtered.items[1] else "";
    const port: u16 = if (filtered.items.len > 3) std.fmt.parseInt(u16, filtered.items[3], 10) catch 6053 else 6053;

    var timer = std.time.Timer.start() catch null;
    try run(allocator, host, port, encryption_key, test_endpoints, timed, stdout_file);
    if (timed) {
        if (timer) |*t| {
            const elapsed_ns = t.read();
            const elapsed_ms = @as(f64, @floatFromInt(elapsed_ns)) / 1_000_000.0;
            const elapsed_s = elapsed_ms / 1000.0;
            writeOut(stdout_file, "\nExecution Time: {d:.3}s\n", .{elapsed_s});
        }
    }
}

fn run(allocator: mem.Allocator, host: []const u8, port: u16, encryption_key: []const u8, test_endpoints: bool, timed: bool, out: std.fs.File) !void {
    const sep60 = "=" ** 60;

    if (!timed) writeOut(out, "Connecting to {s}:{d}...\n", .{ host, port });

    var conn = NoiseConnection.connect(host, port, encryption_key) catch |err| {
        writeOut(out, "Connection failed: {any}\n", .{err});
        return;
    };
    defer conn.close();

    if (!timed) writeOut(out, "Connected successfully!\n\n", .{});

    var recv_buf: [8192]u8 = undefined;
    var proto_buf: [1024]u8 = undefined;

    // Send HelloRequest (msg type 1)
    const hello_len = encodeHelloRequest(&proto_buf);
    try conn.sendMessage(1, proto_buf[0..hello_len]);

    // Read HelloResponse (msg type 2) - handle interleaved messages
    var server_info_copy: [256]u8 = undefined;
    var server_info_len: usize = 0;

    while (true) {
        const msg = try conn.recvMessage(&recv_buf);
        if (msg.msg_type == 2) {
            const fields = ProtoFields.parse(msg.data);
            const si = fields.getString(3);
            if (si.len > 0) {
                @memcpy(server_info_copy[0..si.len], si);
                server_info_len = si.len;
            }
            break;
        }
        try handleInternalMessage(&conn, msg.msg_type, &proto_buf);
    }

    // Send AuthRequest (msg type 3) - don't wait for response with Noise
    try conn.sendMessage(3, &.{});

    // Send DeviceInfoRequest (msg type 9) immediately
    try conn.sendMessage(9, &.{});

    // Read DeviceInfoResponse (msg type 10)
    var di_name: [128]u8 = undefined;
    var di_name_len: usize = 0;
    var di_friendly: [128]u8 = undefined;
    var di_friendly_len: usize = 0;
    var di_mac: [64]u8 = undefined;
    var di_mac_len: usize = 0;
    var di_version: [64]u8 = undefined;
    var di_version_len: usize = 0;
    var di_compile: [128]u8 = undefined;
    var di_compile_len: usize = 0;
    var di_model: [128]u8 = undefined;
    var di_model_len: usize = 0;
    var di_mfg: [128]u8 = undefined;
    var di_mfg_len: usize = 0;

    while (true) {
        const msg = try conn.recvMessage(&recv_buf);
        if (msg.msg_type == 10) {
            const fields = ProtoFields.parse(msg.data);
            const pairs = .{
                .{ @as(u32, 2), &di_name, &di_name_len },
                .{ @as(u32, 3), &di_mac, &di_mac_len },
                .{ @as(u32, 4), &di_version, &di_version_len },
                .{ @as(u32, 5), &di_compile, &di_compile_len },
                .{ @as(u32, 6), &di_model, &di_model_len },
                .{ @as(u32, 12), &di_mfg, &di_mfg_len },
                .{ @as(u32, 13), &di_friendly, &di_friendly_len },
            };
            inline for (pairs) |p| {
                const s = fields.getString(p[0]);
                if (s.len > 0) {
                    @memcpy(p[1][0..s.len], s);
                    p[2].* = s.len;
                }
            }
            break;
        }
        if (msg.msg_type == 4) {
            const fields = ProtoFields.parse(msg.data);
            if (fields.getVarint(1) != 0) {
                writeOut(out, "Error: Authentication failed: invalid password\n", .{});
                return;
            }
            continue;
        }
        try handleInternalMessage(&conn, msg.msg_type, &proto_buf);
    }

    // Print device info
    if (!timed) {
        writeOut(out, "{s}\n", .{sep60});
        writeOut(out, "DEVICE INFORMATION\n", .{});
        writeOut(out, "{s}\n", .{sep60});
        writeOut(out, "Name:                {s}\n", .{di_name[0..di_name_len]});
        if (di_friendly_len > 0) writeOut(out, "Friendly Name:       {s}\n", .{di_friendly[0..di_friendly_len]});
        writeOut(out, "MAC Address:         {s}\n", .{di_mac[0..di_mac_len]});
        writeOut(out, "ESPHome Version:     {s}\n", .{di_version[0..di_version_len]});
        if (di_compile_len > 0) writeOut(out, "Compilation Time:    {s}\n", .{di_compile[0..di_compile_len]});
        if (di_model_len > 0) writeOut(out, "Model:               {s}\n", .{di_model[0..di_model_len]});
        if (di_mfg_len > 0) writeOut(out, "Manufacturer:        {s}\n", .{di_mfg[0..di_mfg_len]});
        if (server_info_len > 0) writeOut(out, "Platform:            {s}\n", .{server_info_copy[0..server_info_len]});
        writeOut(out, "{s}\n\n", .{sep60});
    }

    // Send ListEntitiesRequest (msg type 11)
    try conn.sendMessage(11, &.{});

    // Collect entities until ListEntitiesDoneResponse (msg type 19)
    var entities: std.ArrayList(EntityInfo) = .{};
    defer entities.deinit(allocator);

    var entity_strings: std.ArrayList([]u8) = .{};
    defer {
        for (entity_strings.items) |s| allocator.free(s);
        entity_strings.deinit(allocator);
    }

    while (true) {
        const msg = try conn.recvMessage(&recv_buf);

        if (msg.msg_type == 19) break;

        if (msg.msg_type == 7 or msg.msg_type == 36 or msg.msg_type == 5) {
            try handleInternalMessage(&conn, msg.msg_type, &proto_buf);
            continue;
        }

        if (msgTypeToEntityType(msg.msg_type)) |entity_type| {
            const fields = ProtoFields.parse(msg.data);
            const object_id = fields.getString(1);
            const key = fields.getFixed32(2);
            const name = fields.getString(3);

            const oid_copy = try allocator.dupe(u8, object_id);
            try entity_strings.append(allocator, oid_copy);
            const name_copy = try allocator.dupe(u8, name);
            try entity_strings.append(allocator, name_copy);

            try entities.append(allocator, .{
                .object_id = oid_copy,
                .key = key,
                .name = name_copy,
                .entity_type = entity_type,
                .msg_type = msg.msg_type,
            });
        }
    }

    // Group and display entities
    if (!timed) {
        writeOut(out, "{s}\n", .{sep60});
        writeOut(out, "ENTITIES\n", .{});
        writeOut(out, "{s}\n", .{sep60});
    }

    var total_entities: usize = 0;

    for (group_order) |group_name| {
        var count: usize = 0;
        for (entities.items) |e| {
            if (mem.eql(u8, group_order[getGroupIndex(e.entity_type)], group_name)) count += 1;
        }
        if (count == 0) continue;

        if (!timed) {
            writeOut(out, "\n{s} ({d}):\n", .{ group_name, count });

            var indices: std.ArrayList(usize) = .{};
            defer indices.deinit(allocator);

            for (entities.items, 0..) |e, idx| {
                if (mem.eql(u8, group_order[getGroupIndex(e.entity_type)], group_name)) {
                    try indices.append(allocator, idx);
                }
            }

            const ctx = SortCtx{ .items = entities.items };
            mem.sort(usize, indices.items, ctx, lessThanByName);

            for (indices.items) |idx| {
                const e = entities.items[idx];
                writeOut(out, "  [{d}] {s} ({s})\n", .{ e.key, e.name, e.object_id });
            }
        }

        total_entities += count;
    }

    if (!timed) writeOut(out, "\n{s}\n", .{sep60});
    writeOut(out, "Total Entities: {d}\n", .{total_entities});
    if (!timed) writeOut(out, "{s}\n", .{sep60});

    // REST endpoints
    if (!timed) {
        writeOut(out, "\n\n{s}\n", .{sep60});
        writeOut(out, "REST API ENDPOINTS\n", .{});
        writeOut(out, "{s}\n", .{sep60});
        writeOut(out, "\nBase URL: http://{s}\n\n", .{host});
    }

    // Skipped entities
    if (!timed) {
        var skipped_count: usize = 0;
        for (entities.items) |e| {
            if (entityTypeToRestPrefix(e.entity_type) == null) skipped_count += 1;
        }
        if (skipped_count > 0) {
            writeOut(out, "\n{s}\n", .{sep60});
            writeOut(out, "ENTITIES WITHOUT REST ENDPOINTS ({d})\n", .{skipped_count});
            writeOut(out, "{s}\n", .{sep60});
            for (entities.items) |e| {
                if (entityTypeToRestPrefix(e.entity_type) == null) {
                    writeOut(out, "  [{s}] {s} ({s})\n", .{ e.entity_type, e.name, e.object_id });
                }
            }
            writeOut(out, "\n", .{});
        }
    }

    var rest_total: usize = 0;
    var get_count: usize = 0;

    for (group_order) |group_name| {
        const prefix = entityTypeToRestPrefix(group_name) orelse continue;

        var count: usize = 0;
        for (entities.items) |e| {
            if (mem.eql(u8, group_order[getGroupIndex(e.entity_type)], group_name) and entityTypeToRestPrefix(e.entity_type) != null)
                count += 1;
        }
        if (count == 0) continue;

        if (!timed) {
            writeOut(out, "\n{s} ({d}):\n", .{ group_name, count });

            var indices: std.ArrayList(usize) = .{};
            defer indices.deinit(allocator);

            for (entities.items, 0..) |e, idx| {
                if (mem.eql(u8, group_order[getGroupIndex(e.entity_type)], group_name) and entityTypeToRestPrefix(e.entity_type) != null)
                    try indices.append(allocator, idx);
            }

            const ctx = SortCtx{ .items = entities.items };
            mem.sort(usize, indices.items, ctx, lessThanByOid);

            for (indices.items) |idx| {
                const e = entities.items[idx];
                const has_post = entityHasPostEndpoint(e.entity_type);
                const methods = if (has_post) "GET, POST" else "GET";
                const actions = entityActions(e.entity_type);

                writeOut(out, "\n  {s}\n", .{e.name});
                writeOut(out, "    Endpoint: /{s}/{s}\n", .{ prefix, e.object_id });
                writeOut(out, "    Methods:  {s}\n", .{methods});
                if (actions.len > 0) {
                    writeOut(out, "    Actions:  {s}\n", .{actions});
                }
            }
        }

        rest_total += count;
        get_count += count;
    }

    const post_only = rest_total - get_count;

    if (!timed) writeOut(out, "\n{s}\n", .{sep60});
    writeOut(out, "Total REST Endpoints: {d}\n", .{rest_total});
    writeOut(out, "  GET-capable:  {d}\n", .{get_count});
    writeOut(out, "  POST-only:    {d}\n", .{post_only});
    if (!timed) {
        writeOut(out, "{s}\n", .{sep60});
        writeOut(out, "\nExample Usage:\n", .{});
        writeOut(out, "  GET  http://{s}/sensor/{{sensor_id}}\n", .{host});
        writeOut(out, "  POST http://{s}/switch/{{switch_id}}/turn_on\n", .{host});
        writeOut(out, "  POST http://{s}/light/{{light_id}}/toggle\n\n", .{host});
    }

    // Disconnect
    conn.sendMessage(5, &.{}) catch {};

    if (test_endpoints) {
        testRestEndpoints(allocator, host, entities.items, timed, out) catch |err| {
            writeOut(out, "REST test error: {any}\n", .{err});
        };
    }
}

fn handleInternalMessage(conn: *NoiseConnection, msg_type: u16, proto_buf: []u8) !void {
    switch (msg_type) {
        7 => try conn.sendMessage(8, &.{}),
        36 => {
            const len = encodeGetTimeResponse(proto_buf);
            try conn.sendMessage(37, proto_buf[0..len]);
        },
        5 => conn.sendMessage(6, &.{}) catch {},
        else => {},
    }
}

fn testRestEndpoints(allocator: mem.Allocator, host: []const u8, entities_list: []const EntityInfo, timed: bool, out: std.fs.File) !void {
    const sep60 = "=" ** 60;
    if (!timed) {
        writeOut(out, "\n{s}\n", .{sep60});
        writeOut(out, "TESTING REST ENDPOINTS (GET)\n", .{});
        writeOut(out, "{s}\n\n", .{sep60});
    }

    var get_endpoints: usize = 0;
    for (entities_list) |e| {
        if (entityTypeToRestPrefix(e.entity_type) != null) get_endpoints += 1;
    }

    if (get_endpoints == 0) {
        writeOut(out, "No GET endpoints found to test.\n", .{});
        return;
    }

    if (!timed) writeOut(out, "Testing {d} GET endpoints...\n\n", .{get_endpoints});

    var success_count: usize = 0;
    var fail_count: usize = 0;

    var client: std.http.Client = .{ .allocator = allocator };
    defer client.deinit();

    for (entities_list) |e| {
        const prefix = entityTypeToRestPrefix(e.entity_type) orelse continue;

        var url_buf: [512]u8 = undefined;
        const url = std.fmt.bufPrint(&url_buf, "http://{s}/{s}/{s}", .{ host, prefix, e.object_id }) catch continue;

        const result = httpGetFetch(&client, allocator, url) catch {
            if (!timed) {
                writeOut(out, "FAIL [{s}] {s} - ERROR\n", .{ e.entity_type, e.name });
                writeOut(out, "  URL: {s}\n\n", .{url});
            }
            fail_count += 1;
            continue;
        };

        if (!timed) {
            writeOut(out, "OK   [{s}] {s}\n", .{ e.entity_type, e.name });
            writeOut(out, "  URL: {s}\n", .{url});
            const display_len = @min(result.len, 512);
            writeOut(out, "  Response: {s}\n\n", .{result[0..display_len]});
        }
        allocator.free(result);
        success_count += 1;
    }

    if (!timed) writeOut(out, "{s}\n", .{sep60});
    writeOut(out, "TEST SUMMARY\n", .{});
    if (!timed) writeOut(out, "{s}\n", .{sep60});
    writeOut(out, "Total Tested:  {d}\n", .{get_endpoints});
    writeOut(out, "Successful:    {d}\n", .{success_count});
    writeOut(out, "Failed:        {d}\n", .{fail_count});
    if (!timed) writeOut(out, "{s}\n\n", .{sep60});
}

fn httpGetFetch(client: *std.http.Client, allocator: mem.Allocator, url: []const u8) ![]u8 {
    var aw: std.Io.Writer.Allocating = .init(allocator);
    defer aw.deinit();

    const result = try client.fetch(.{
        .location = .{ .url = url },
        .method = .GET,
        .response_writer = &aw.writer,
    });

    if (result.status != .ok) return error.HttpError;

    return try aw.toOwnedSlice();
}
