#!/usr/bin/env python3
"""
ESPHome Entity ID Retriever
This script connects to an ESPHome device and displays device info and entity list.
"""
import asyncio
import sys
import aiohttp
from aioesphomeapi import APIClient, APIConnectionError


async def get_device_info(host: str, password: str = "", port: int = 6053, encryption_key: str = "", test_endpoints: bool = False):
    """
    Connect to an ESPHome device and retrieve device info and entities.
    
    Args:
        host: IP address or hostname of the ESPHome device
        password: API password (if set)
        port: API port (default: 6053)
        encryption_key: Encryption key for secure connections (noise_psk)
        test_endpoints: Whether to test REST endpoints after listing them
    """
    client = APIClient(host, port, password, noise_psk=encryption_key if encryption_key else None)
    
    try:
        # Connect to the device
        print(f"Connecting to {host}:{port}...")
        await client.connect(login=True)
        print("Connected successfully!\n")
        
        # Get device info
        device_info = await client.device_info()
        print("=" * 60)
        print("DEVICE INFORMATION")
        print("=" * 60)
        print(f"Name:                {device_info.name}")
        if hasattr(device_info, 'friendly_name') and device_info.friendly_name:
            print(f"Friendly Name:       {device_info.friendly_name}")
        print(f"MAC Address:         {device_info.mac_address}")
        print(f"ESPHome Version:     {device_info.esphome_version}")
        if hasattr(device_info, 'compilation_time') and device_info.compilation_time:
            print(f"Compilation Time:    {device_info.compilation_time}")
        if hasattr(device_info, 'model') and device_info.model:
            print(f"Model:               {device_info.model}")
        if hasattr(device_info, 'manufacturer') and device_info.manufacturer:
            print(f"Manufacturer:        {device_info.manufacturer}")
        if hasattr(device_info, 'platform') and device_info.platform:
            print(f"Platform:            {device_info.platform}")
        if hasattr(device_info, 'board') and device_info.board:
            print(f"Board:               {device_info.board}")
        print("=" * 60)
        print()
        
        # List all entities
        entities, services = await client.list_entities_services()
        
        print("=" * 60)
        print("ENTITIES")
        print("=" * 60)

        # Group entities by type
        entity_groups = {
            'Binary Sensors': [],
            'Sensors': [],
            'Switches': [],
            'Buttons': [],
            'Lights': [],
            'Fans': [],
            'Covers': [],
            'Climate': [],
            'Numbers': [],
            'Selects': [],
            'Text Sensors': [],
            'Locks': [],
            'Media Players': [],
            'Cameras': [],
            'Other': []
        }
        
        for entity in entities:
            entity_type = type(entity).__name__.replace('Info', '')
            entity_info = f"  [{entity.key}] {entity.name} ({entity.object_id})"
            
            if 'BinarySensor' in entity_type:
                entity_groups['Binary Sensors'].append(entity_info)
            elif 'Sensor' in entity_type and 'Binary' not in entity_type and 'Text' not in entity_type:
                entity_groups['Sensors'].append(entity_info)
            elif 'Switch' in entity_type:
                entity_groups['Switches'].append(entity_info)
            elif 'Button' in entity_type:
                entity_groups['Buttons'].append(entity_info)
            elif 'Light' in entity_type:
                entity_groups['Lights'].append(entity_info)
            elif 'Fan' in entity_type:
                entity_groups['Fans'].append(entity_info)
            elif 'Cover' in entity_type:
                entity_groups['Covers'].append(entity_info)
            elif 'Climate' in entity_type:
                entity_groups['Climate'].append(entity_info)
            elif 'Number' in entity_type:
                entity_groups['Numbers'].append(entity_info)
            elif 'Select' in entity_type:
                entity_groups['Selects'].append(entity_info)
            elif 'TextSensor' in entity_type:
                entity_groups['Text Sensors'].append(entity_info)
            elif 'Lock' in entity_type:
                entity_groups['Locks'].append(entity_info)
            elif 'MediaPlayer' in entity_type:
                entity_groups['Media Players'].append(entity_info)
            elif 'Camera' in entity_type:
                entity_groups['Cameras'].append(entity_info)
            else:
                entity_groups['Other'].append(entity_info)
        
        # Print grouped entities
        total_entities = 0
        for group_name, group_entities in entity_groups.items():
            if group_entities:
                print(f"\n{group_name} ({len(group_entities)}):")
                for entity in sorted(group_entities):
                    print(entity)
                total_entities += len(group_entities)
        
        print()
        print("=" * 60)
        print(f"Total Entities: {total_entities}")
        print("=" * 60)
        
        # List services
        if services:
            print()
            print("=" * 60)
            print("SERVICES")
            print("=" * 60)
            for service in services:
                print(f"\n{service.name} (Key: {service.key})")
                if service.args:
                    for arg in service.args:
                        print(f"  - {arg.name}: {arg}")
        
        # Generate REST endpoints
        print()
        print()
        print("=" * 60)
        print("REST API ENDPOINTS")
        print("=" * 60)
        print(f"\nBase URL: http://{host}")
        print()
        
        rest_endpoints = []
        skipped_entities = []
        
        for entity in entities:
            entity_type = type(entity).__name__.replace('Info', '')
            entity_id = entity.object_id
            
            # Binary Sensors (GET only)
            if 'BinarySensor' in entity_type:
                rest_endpoints.append({
                    'type': 'Binary Sensor',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET'],
                    'endpoint': f"/binary_sensor/{entity_id}"
                })
            
            # Text Sensors (GET only)
            elif 'TextSensor' in entity_type:
                rest_endpoints.append({
                    'type': 'Text Sensor',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET'],
                    'endpoint': f"/text_sensor/{entity_id}"
                })
            
            # Regular Sensors (GET only)
            elif 'Sensor' in entity_type:
                rest_endpoints.append({
                    'type': 'Sensor',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET'],
                    'endpoint': f"/sensor/{entity_id}"
                })
            
            # Controllable entities (GET and POST)
            elif 'Switch' in entity_type:
                rest_endpoints.append({
                    'type': 'Switch',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/switch/{entity_id}",
                    'actions': ['turn_on', 'turn_off', 'toggle']
                })
            
            elif 'Light' in entity_type:
                rest_endpoints.append({
                    'type': 'Light',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/light/{entity_id}",
                    'actions': ['turn_on', 'turn_off', 'toggle']
                })
            
            elif 'Button' in entity_type:
                rest_endpoints.append({
                    'type': 'Button',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/button/{entity_id}",
                    'actions': ['press']
                })
            
            elif 'Fan' in entity_type:
                rest_endpoints.append({
                    'type': 'Fan',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/fan/{entity_id}",
                    'actions': ['turn_on', 'turn_off', 'toggle']
                })
            
            elif 'Cover' in entity_type:
                rest_endpoints.append({
                    'type': 'Cover',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/cover/{entity_id}",
                    'actions': ['open', 'close', 'stop']
                })
            
            elif 'Climate' in entity_type:
                rest_endpoints.append({
                    'type': 'Climate',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/climate/{entity_id}",
                    'actions': ['set mode, temperature']
                })
            
            elif 'Number' in entity_type:
                rest_endpoints.append({
                    'type': 'Number',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/number/{entity_id}",
                    'actions': ['set value']
                })
            
            elif 'Select' in entity_type:
                rest_endpoints.append({
                    'type': 'Select',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/select/{entity_id}",
                    'actions': ['set option']
                })
            
            elif 'Lock' in entity_type:
                rest_endpoints.append({
                    'type': 'Lock',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/lock/{entity_id}",
                    'actions': ['lock', 'unlock']
                })
            
            elif 'Time' in entity_type:
                rest_endpoints.append({
                    'type': 'Time',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/time/{entity_id}",
                    'actions': ['set time']
                })
            
            elif 'Text' in entity_type:
                rest_endpoints.append({
                    'type': 'Text',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/text/{entity_id}",
                    'actions': ['set text']
                })
            else:
                # Track entities that don't have REST endpoints
                skipped_entities.append({
                    'entity': entity.name,
                    'object_id': entity_id,
                    'type': entity_type
                })
        
        # Print skipped entities info
        if skipped_entities:
            print()
            print("=" * 60)
            print(f"ENTITIES WITHOUT REST ENDPOINTS ({len(skipped_entities)})")
            print("=" * 60)
            for item in skipped_entities:
                print(f"  [{item['type']}] {item['entity']} ({item['object_id']})")
            print()
        
        # Print REST endpoints grouped by type
        endpoint_groups = {}
        for ep in rest_endpoints:
            ep_type = ep['type']
            if ep_type not in endpoint_groups:
                endpoint_groups[ep_type] = []
            endpoint_groups[ep_type].append(ep)
        
        for ep_type, endpoints in sorted(endpoint_groups.items()):
            print(f"\n{ep_type} ({len(endpoints)}):")
            for ep in sorted(endpoints, key=lambda x: x['object_id']):
                methods = ', '.join(ep['methods'])
                print(f"\n  {ep['entity']}")
                print(f"    Endpoint: {ep['endpoint']}")
                print(f"    Methods:  {methods}")
                if 'actions' in ep:
                    actions = ', '.join(ep['actions'])
                    print(f"    Actions:  {actions}")
        
        print()
        print("=" * 60)
        print(f"Total REST Endpoints: {len(rest_endpoints)}")
        
        # Count GET-capable endpoints
        get_count = len([ep for ep in rest_endpoints if 'GET' in ep['methods']])
        post_only_count = len([ep for ep in rest_endpoints if 'GET' not in ep['methods']])
        
        print(f"  GET-capable:  {get_count}")
        print(f"  POST-only:    {post_only_count}")
        print("=" * 60)
        print()
        print("Example Usage:")
        print("  GET  http://{host}/sensor/{sensor_id}")
        print("  POST http://{host}/switch/{switch_id}/turn_on")
        print("  POST http://{host}/light/{light_id}/toggle")
        print()
        
        # Test endpoints if requested
        if test_endpoints:
            await test_rest_endpoints(host, rest_endpoints)
        
        return rest_endpoints
        
    except APIConnectionError as e:
        print(f"Error connecting to device: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return False
    finally:
        await client.disconnect()
    
    return True


async def test_rest_endpoints(host: str, rest_endpoints: list):
    """
    Test all GET endpoints and display responses.
    
    Args:
        host: IP address or hostname of the ESPHome device
        rest_endpoints: List of endpoint dictionaries
    """
    print()
    print("=" * 60)
    print("TESTING REST ENDPOINTS (GET)")
    print("=" * 60)
    print()
    
    # Filter endpoints that support GET
    get_endpoints = [ep for ep in rest_endpoints if 'GET' in ep['methods']]
    
    if not get_endpoints:
        print("No GET endpoints found to test.")
        return
    
    print(f"Testing {len(get_endpoints)} GET endpoints...\n")
    
    success_count = 0
    fail_count = 0
    
    async with aiohttp.ClientSession() as session:
        for ep in get_endpoints:
            url = f"http://{host}{ep['endpoint']}"
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        try:
                            data = await response.json()
                            status_icon = "✓"
                            success_count += 1
                            print(f"{status_icon} [{ep['type']}] {ep['entity']}")
                            print(f"  URL: {url}")
                            print(f"  Response: {data}")
                        except Exception:
                            # Try as text if JSON parsing fails
                            text = await response.text()
                            status_icon = "✓"
                            success_count += 1
                            print(f"{status_icon} [{ep['type']}] {ep['entity']}")
                            print(f"  URL: {url}")
                            print(f"  Response: {text}")
                    else:
                        status_icon = "✗"
                        fail_count += 1
                        text = await response.text()
                        print(f"{status_icon} [{ep['type']}] {ep['entity']} - FAILED")
                        print(f"  URL: {url}")
                        print(f"  Status: {response.status}")
                        print(f"  Response: {text}")
                    print()
            except asyncio.TimeoutError:
                status_icon = "✗"
                fail_count += 1
                print(f"{status_icon} [{ep['type']}] {ep['entity']} - TIMEOUT")
                print(f"  URL: {url}")
                print(f"  Error: Request timed out after 5 seconds")
                print()
            except aiohttp.ClientError as e:
                status_icon = "✗"
                fail_count += 1
                print(f"{status_icon} [{ep['type']}] {ep['entity']} - CONNECTION ERROR")
                print(f"  URL: {url}")
                print(f"  Error: {e}")
                print()
            except Exception as e:
                status_icon = "✗"
                fail_count += 1
                print(f"{status_icon} [{ep['type']}] {ep['entity']} - ERROR")
                print(f"  URL: {url}")
                print(f"  Error: {e}")
                print()
    
    print("=" * 60)
    print(f"TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tested:  {len(get_endpoints)}")
    print(f"Successful:    {success_count} ✓")
    print(f"Failed:        {fail_count} ✗")
    print("=" * 60)
    print()


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python get_ids.py <host> [encryption_key] [password] [port] [--test]")
        print("\nExamples:")
        print("  python get_ids.py 192.168.1.100")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key'")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' mypassword")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' mypassword 6053")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' '' 6053 --test")
        print("\nNote: Encryption key is the API encryption key from ESPHome (noise_psk)")
        print("      Add --test flag to test all GET endpoints")
        sys.exit(1)
    
    # Check for --test flag
    test_endpoints = '--test' in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != '--test']
    
    host = args[0]
    encryption_key = args[1] if len(args) > 1 else ""
    password = args[2] if len(args) > 2 else ""
    port = int(args[3]) if len(args) > 3 else 6053
    
    # Run the async function
    success = asyncio.run(get_device_info(host, password, port, encryption_key, test_endpoints))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
