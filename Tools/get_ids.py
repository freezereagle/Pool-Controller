#!/usr/bin/env python3
"""
ESPHome Entity ID Retriever
This script connects to an ESPHome device and displays device info and entity list.
"""
import asyncio
import sys
import time
import os
import json
import aiohttp
from aioesphomeapi import APIClient, APIConnectionError


async def get_device_info(host: str, password: str = "", port: int = 6053, encryption_key: str = "", test_endpoints: bool = False, timed: bool = False, web_out: str = "", web_lang: str = ""):
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
        if not timed:
            print(f"Connecting to {host}:{port}...")
        await client.connect(login=True)
        if not timed:
            print("Connected successfully!\n")
        
        # Get device info
        device_info = await client.device_info()
        if not timed:
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
        
        if not timed:
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
                if not timed:
                    print(f"\n{group_name} ({len(group_entities)}):")
                    for entity in sorted(group_entities):
                        print(entity)
                total_entities += len(group_entities)
        
        if not timed:
            print()
            print("=" * 60)
        print(f"Total Entities: {total_entities}")
        if not timed:
            print("=" * 60)
        
        # List services
        if services and not timed:
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
        if not timed:
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
                select_options = list(entity.options) if hasattr(entity, 'options') else []
                rest_endpoints.append({
                    'type': 'Select',
                    'entity': entity.name,
                    'object_id': entity_id,
                    'methods': ['GET', 'POST'],
                    'endpoint': f"/select/{entity_id}",
                    'actions': ['set option'],
                    'options': select_options
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
        if skipped_entities and not timed:
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
        
        if not timed:
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
        
        if not timed:
            print()
            print("=" * 60)
        print(f"Total REST Endpoints: {len(rest_endpoints)}")
        
        # Count GET-capable endpoints
        get_count = len([ep for ep in rest_endpoints if 'GET' in ep['methods']])
        post_only_count = len([ep for ep in rest_endpoints if 'GET' not in ep['methods']])
        
        print(f"  GET-capable:  {get_count}")
        print(f"  POST-only:    {post_only_count}")
        if not timed:
            print("=" * 60)
            print()
        if not timed:
            print("Example Usage:")
            print("  GET  http://{host}/sensor/{sensor_id}")
            print("  POST http://{host}/switch/{switch_id}/turn_on")
            print("  POST http://{host}/light/{light_id}/toggle")
            print()
        
        # Test endpoints if requested
        if test_endpoints:
            await test_rest_endpoints(host, rest_endpoints, timed)
        
        # Generate web interface if requested
        if web_out and web_lang:
            device_name = device_info.friendly_name if hasattr(device_info, 'friendly_name') and device_info.friendly_name else device_info.name
            generate_web_interface(host, device_name, rest_endpoints, web_out, web_lang)
        
        return rest_endpoints
        
    except APIConnectionError as e:
        print(f"Error connecting to device: {e}", file=sys.stderr)
        return False
    except Exception as e:
        import traceback
        print(f"Unexpected error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return False
    finally:
        await client.disconnect()
    
    return True


def generate_web_interface(host: str, device_name: str, rest_endpoints: list, out_dir: str, lang: str):
    """
    Generate a web interface for the ESPHome device REST API.
    
    Args:
        host: IP address or hostname of the device
        device_name: Friendly name of the device
        rest_endpoints: List of endpoint dictionaries
        out_dir: Output directory path
        lang: 'js' or 'ts'
    """
    os.makedirs(out_dir, exist_ok=True)
    
    # Build entity config as JSON array
    entities_json = json.dumps(rest_endpoints, indent=2)
    
    # Determine file extension
    ext = lang  # 'js' or 'ts'
    
    # Write api.js or api.ts
    api_code = _generate_api_code(host, lang)
    api_path = os.path.join(out_dir, f"api.{ext}")
    with open(api_path, 'w', encoding='utf-8') as f:
        f.write(api_code)
    
    # Write index.html
    html = _generate_html(host, device_name, rest_endpoints, ext)
    html_path = os.path.join(out_dir, 'index.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    # For TypeScript, write support files
    if lang == 'ts':
        tsconfig = json.dumps({
            "compilerOptions": {
                "target": "ES2020",
                "module": "ES2020",
                "strict": True,
                "esModuleInterop": True,
                "outDir": "./dist",
                "rootDir": ".",
                "declaration": True,
                "sourceMap": True
            },
            "include": ["*.ts"],
            "exclude": ["node_modules"]
        }, indent=2)
        with open(os.path.join(out_dir, 'tsconfig.json'), 'w', encoding='utf-8') as f:
            f.write(tsconfig + '\n')
    
    # Write package.json for both (useful for serving)
    pkg = json.dumps({
        "name": "esphome-dashboard",
        "version": "1.0.0",
        "description": f"ESPHome REST Dashboard for {device_name}",
        "scripts": {
            "build": "tsc && node -e \"require('fs').cpSync('index.html','dist/index.html')\"" if lang == 'ts' else "echo No build needed",
            "serve": "python -m http.server 8080" if lang == 'js' else "npm run build && python -m http.server 8080 --directory dist"
        },
        "devDependencies": {"typescript": "^5.0.0"} if lang == 'ts' else {}
    }, indent=2)
    with open(os.path.join(out_dir, 'package.json'), 'w', encoding='utf-8') as f:
        f.write(pkg + '\n')
    
    print(f"\nWeb interface generated in: {os.path.abspath(out_dir)}")
    print(f"  - index.html")
    print(f"  - api.{ext}")
    print(f"  - package.json")
    if lang == 'ts':
        print(f"  - tsconfig.json")
    print(f"\nOpen index.html in a browser to use the dashboard.")


def _generate_api_code(host: str, lang: str) -> str:
    """Generate the API client code (JS or TS)."""
    if lang == 'ts':
        return f'''// ESPHome REST API Client - TypeScript
// Auto-generated by get_ids

const BASE_URL = 'http://{host}';

interface EntityState {{
  id: string;
  state: string;
  value: string | number | boolean;
  [key: string]: unknown;
}}

async function getEntity(endpoint: string): Promise<EntityState> {{
  const resp = await fetch(`${{BASE_URL}}${{endpoint}}`);
  if (!resp.ok) throw new Error(`GET ${{endpoint}} failed: ${{resp.status}}`);
  return resp.json();
}}

async function postAction(endpoint: string, action: string): Promise<Response> {{
  const resp = await fetch(`${{BASE_URL}}${{endpoint}}/${{action}}`, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST ${{endpoint}}/${{action}} failed: ${{resp.status}}`);
  return resp;
}}

async function postValue(endpoint: string, value: string | number): Promise<Response> {{
  const url = `${{BASE_URL}}${{endpoint}}/set?value=${{encodeURIComponent(String(value))}}`;
  const resp = await fetch(url, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST set value failed: ${{resp.status}}`);
  return resp;
}}

async function postTime(endpoint: string, hour: number, minute: number, second: number): Promise<Response> {{
  const url = `${{BASE_URL}}${{endpoint}}/set?hour=${{hour}}&minute=${{minute}}&second=${{second}}`;
  const resp = await fetch(url, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST set time failed: ${{resp.status}}`);
  return resp;
}}
'''
    else:
        return f'''// ESPHome REST API Client - JavaScript
// Auto-generated by get_ids

const BASE_URL = 'http://{host}';

async function getEntity(endpoint) {{
  const resp = await fetch(`${{BASE_URL}}${{endpoint}}`);
  if (!resp.ok) throw new Error(`GET ${{endpoint}} failed: ${{resp.status}}`);
  return resp.json();
}}

async function postAction(endpoint, action) {{
  const resp = await fetch(`${{BASE_URL}}${{endpoint}}/${{action}}`, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST ${{endpoint}}/${{action}} failed: ${{resp.status}}`);
  return resp;
}}

async function postValue(endpoint, value) {{
  const url = `${{BASE_URL}}${{endpoint}}/set?value=${{encodeURIComponent(String(value))}}`;
  const resp = await fetch(url, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST set value failed: ${{resp.status}}`);
  return resp;
}}

async function postTime(endpoint, hour, minute, second) {{
  const url = `${{BASE_URL}}${{endpoint}}/set?hour=${{hour}}&minute=${{minute}}&second=${{second}}`;
  const resp = await fetch(url, {{ method: 'POST' }});
  if (!resp.ok) throw new Error(`POST set time failed: ${{resp.status}}`);
  return resp;
}}
'''


def _generate_html(host: str, device_name: str, rest_endpoints: list, ext: str) -> str:
    """Generate the dashboard HTML with embedded CSS and inline JS for UI interactions."""
    
    # Group endpoints by type for the HTML
    groups = {}
    for ep in rest_endpoints:
        t = ep['type']
        if t not in groups:
            groups[t] = []
        groups[t].append(ep)
    
    # Sort order
    type_order = ['Binary Sensor', 'Sensor', 'Text Sensor', 'Switch', 'Button',
                  'Light', 'Fan', 'Cover', 'Climate', 'Number', 'Select', 'Lock', 'Time', 'Text']
    
    # Build entity cards HTML
    sections_html = ''
    for t in type_order:
        if t not in groups:
            continue
        eps = sorted(groups[t], key=lambda e: e['entity'])
        icon = _entity_icon(t)
        sections_html += f'    <div class="section">\n'
        sections_html += f'      <h2>{icon} {t} ({len(eps)})</h2>\n'
        sections_html += f'      <div class="cards">\n'
        for ep in eps:
            sections_html += _entity_card_html(ep, t)
        sections_html += f'      </div>\n'
        sections_html += f'    </div>\n'
    
    # Build the entities JSON for embedding in the page
    entities_js = json.dumps(rest_endpoints)
    
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{device_name} - ESPHome Dashboard</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #0d1117; color: #c9d1d9; padding: 20px; }}
    h1 {{ text-align: center; color: #58a6ff; margin-bottom: 8px; font-size: 1.8em; }}
    .subtitle {{ text-align: center; color: #8b949e; margin-bottom: 24px; font-size: 0.9em; }}
    .section {{ margin-bottom: 24px; }}
    .section h2 {{ color: #58a6ff; border-bottom: 1px solid #21262d; padding-bottom: 8px;
                   margin-bottom: 12px; font-size: 1.2em; }}
    .cards {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }}
    .card {{ background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }}
    .card h3 {{ font-size: 0.95em; color: #e6edf3; margin-bottom: 8px; }}
    .card .endpoint {{ font-size: 0.75em; color: #8b949e; margin-bottom: 8px; font-family: monospace; }}
    .card .state {{ font-size: 1.3em; font-weight: 600; color: #58a6ff; margin-bottom: 8px;
                    min-height: 1.5em; }}
    .card .state.on {{ color: #3fb950; }}
    .card .state.off {{ color: #f85149; }}
    .card .actions {{ display: flex; gap: 6px; flex-wrap: wrap; }}
    .card .actions button {{ background: #21262d; color: #c9d1d9; border: 1px solid #30363d;
                             border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 0.8em; }}
    .card .actions button:hover {{ background: #30363d; border-color: #58a6ff; }}
    .card .actions button.on {{ background: #238636; border-color: #2ea043; }}
    .card .actions button.off {{ background: #da3633; border-color: #f85149; }}
    .card .actions button.press {{ background: #1f6feb; border-color: #388bfd; }}
    .card input[type=number], .card input[type=time], .card select {{
      background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px;
      padding: 4px 8px; font-size: 0.85em; width: 120px; }}
    .card .input-row {{ display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }}
    .refresh-bar {{ text-align: center; margin-bottom: 16px; }}
    .refresh-bar button {{ background: #21262d; color: #c9d1d9; border: 1px solid #30363d;
                           border-radius: 4px; padding: 6px 16px; cursor: pointer; margin: 0 4px; }}
    .refresh-bar button:hover {{ background: #30363d; border-color: #58a6ff; }}
    .refresh-bar button.active {{ background: #1f6feb; border-color: #388bfd; }}
    .status-dot {{ display: inline-block; width: 8px; height: 8px; border-radius: 50%;
                   margin-right: 6px; background: #484f58; }}
    .status-dot.on {{ background: #3fb950; }}
    .status-dot.off {{ background: #f85149; }}
    .error {{ color: #f85149; font-size: 0.8em; }}
  </style>
</head>
<body>
  <h1>{device_name}</h1>
  <div class="subtitle">ESPHome REST Dashboard &middot; {host}</div>
  <div class="refresh-bar">
    <button onclick="refreshAll()">&#x21bb; Refresh All</button>
    <button id="autoBtn" onclick="toggleAuto()">Auto: OFF</button>
  </div>
{sections_html}
  <script src="api.js"></script>
  <script>
    const ENTITIES = {entities_js};
    let autoInterval = null;

    function refreshAll() {{
      ENTITIES.forEach(ep => {{
        if (ep.methods.includes('GET')) fetchState(ep);
      }});
    }}

    function toggleAuto() {{
      const btn = document.getElementById('autoBtn');
      if (autoInterval) {{
        clearInterval(autoInterval);
        autoInterval = null;
        btn.textContent = 'Auto: OFF';
        btn.classList.remove('active');
      }} else {{
        autoInterval = setInterval(refreshAll, 5000);
        btn.textContent = 'Auto: ON (5s)';
        btn.classList.add('active');
        refreshAll();
      }}
    }}

    async function fetchState(ep) {{
      const card = document.getElementById('card-' + ep.object_id);
      if (!card) return;
      const stateEl = card.querySelector('.state');
      try {{
        const data = await getEntity(ep.endpoint);
        const val = data.state !== undefined ? data.state : data.value;
        stateEl.textContent = val;
        stateEl.className = 'state';
        if (ep.type === 'Select') {{
          const sel = document.getElementById('input-' + ep.object_id);
          if (sel) sel.value = val;
        }}
        if (typeof val === 'boolean' || val === 'ON' || val === 'OFF') {{
          stateEl.classList.add(val === true || val === 'ON' ? 'on' : 'off');
          const dot = card.querySelector('.status-dot');
          if (dot) {{
            dot.className = 'status-dot ' + (val === true || val === 'ON' ? 'on' : 'off');
          }}
        }}
      }} catch(e) {{
        stateEl.textContent = 'Error';
        stateEl.className = 'state error';
      }}
    }}

    async function doAction(endpoint, action, oid) {{
      try {{
        await postAction(endpoint, action);
        setTimeout(() => {{
          const ep = ENTITIES.find(e => e.object_id === oid);
          if (ep) fetchState(ep);
        }}, 300);
      }} catch(e) {{ console.error(e); }}
    }}

    async function doSetValue(endpoint, oid) {{
      const input = document.getElementById('input-' + oid);
      if (!input) return;
      try {{
        await postValue(endpoint, input.value);
        setTimeout(() => {{
          const ep = ENTITIES.find(e => e.object_id === oid);
          if (ep) fetchState(ep);
        }}, 300);
      }} catch(e) {{ console.error(e); }}
    }}

    async function doSetTime(endpoint, oid) {{
      const input = document.getElementById('input-' + oid);
      if (!input || !input.value) return;
      const parts = input.value.split(':');
      const h = parseInt(parts[0]), m = parseInt(parts[1]), s = parts[2] ? parseInt(parts[2]) : 0;
      try {{
        await postTime(endpoint, h, m, s);
        setTimeout(() => {{
          const ep = ENTITIES.find(e => e.object_id === oid);
          if (ep) fetchState(ep);
        }}, 300);
      }} catch(e) {{ console.error(e); }}
    }}

    async function doSetOption(endpoint, oid) {{
      const sel = document.getElementById('input-' + oid);
      if (!sel) return;
      try {{
        await postValue(endpoint, sel.value);
        setTimeout(() => {{
          const ep = ENTITIES.find(e => e.object_id === oid);
          if (ep) fetchState(ep);
        }}, 300);
      }} catch(e) {{ console.error(e); }}
    }}

    // Initial load
    refreshAll();
  </script>
</body>
</html>'''


def _entity_icon(entity_type: str) -> str:
    """Return an emoji icon for an entity type."""
    icons = {
        'Binary Sensor': '&#x1f534;',
        'Sensor': '&#x1f4ca;',
        'Text Sensor': '&#x1f4dd;',
        'Switch': '&#x1f50c;',
        'Button': '&#x1f518;',
        'Light': '&#x1f4a1;',
        'Fan': '&#x1f32c;',
        'Cover': '&#x1f3e0;',
        'Climate': '&#x1f321;',
        'Number': '&#x1f522;',
        'Select': '&#x1f4cb;',
        'Lock': '&#x1f512;',
        'Time': '&#x1f552;',
        'Text': '&#x1f4ac;',
    }
    return icons.get(entity_type, '&#x2699;')


def _entity_card_html(ep: dict, entity_type: str) -> str:
    """Generate a single entity card's HTML."""
    oid = ep['object_id']
    name = ep['entity']
    endpoint = ep['endpoint']
    actions = ep.get('actions', [])
    
    card = f'        <div class="card" id="card-{oid}">\n'
    card += f'          <h3><span class="status-dot"></span>{name}</h3>\n'
    card += f'          <div class="endpoint">{endpoint}</div>\n'
    card += f'          <div class="state">--</div>\n'
    
    if entity_type == 'Switch' or entity_type == 'Light' or entity_type == 'Fan':
        card += f'          <div class="actions">\n'
        card += f'            <button class="on" onclick="doAction(\'{endpoint}\',\'turn_on\',\'{oid}\')">ON</button>\n'
        card += f'            <button class="off" onclick="doAction(\'{endpoint}\',\'turn_off\',\'{oid}\')">OFF</button>\n'
        card += f'            <button onclick="doAction(\'{endpoint}\',\'toggle\',\'{oid}\')">Toggle</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Button':
        card += f'          <div class="actions">\n'
        card += f'            <button class="press" onclick="doAction(\'{endpoint}\',\'press\',\'{oid}\')">Press</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Cover':
        card += f'          <div class="actions">\n'
        card += f'            <button onclick="doAction(\'{endpoint}\',\'open\',\'{oid}\')">Open</button>\n'
        card += f'            <button onclick="doAction(\'{endpoint}\',\'close\',\'{oid}\')">Close</button>\n'
        card += f'            <button onclick="doAction(\'{endpoint}\',\'stop\',\'{oid}\')">Stop</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Lock':
        card += f'          <div class="actions">\n'
        card += f'            <button class="on" onclick="doAction(\'{endpoint}\',\'lock\',\'{oid}\')">Lock</button>\n'
        card += f'            <button class="off" onclick="doAction(\'{endpoint}\',\'unlock\',\'{oid}\')">Unlock</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Number':
        card += f'          <div class="input-row">\n'
        card += f'            <input type="number" id="input-{oid}" step="any" />\n'
        card += f'            <button onclick="doSetValue(\'{endpoint}\',\'{oid}\')">Set</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Select':
        options = ep.get('options', [])
        card += f'          <div class="input-row">\n'
        card += f'            <select id="input-{oid}" style="width:140px;">\n'
        for opt in options:
            card += f'              <option value="{opt}">{opt}</option>\n'
        card += f'            </select>\n'
        card += f'            <button onclick="doSetOption(\'{endpoint}\',\'{oid}\')">Set</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Time':
        card += f'          <div class="input-row">\n'
        card += f'            <input type="time" id="input-{oid}" step="1" />\n'
        card += f'            <button onclick="doSetTime(\'{endpoint}\',\'{oid}\')">Set</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Text':
        card += f'          <div class="input-row">\n'
        card += f'            <input type="text" id="input-{oid}" placeholder="text" style="width:160px;" />\n'
        card += f'            <button onclick="doSetValue(\'{endpoint}\',\'{oid}\')">Set</button>\n'
        card += f'          </div>\n'
    elif entity_type == 'Climate':
        card += f'          <div class="input-row">\n'
        card += f'            <input type="number" id="input-{oid}" step="0.5" placeholder="temp" />\n'
        card += f'            <button onclick="doSetValue(\'{endpoint}\',\'{oid}\')">Set</button>\n'
        card += f'          </div>\n'
    
    card += f'        </div>\n'
    return card


async def test_rest_endpoints(host: str, rest_endpoints: list, timed: bool = False):
    """
    Test all GET endpoints and display responses.
    
    Args:
        host: IP address or hostname of the ESPHome device
        rest_endpoints: List of endpoint dictionaries
        timed: If True, only print summary
    """
    if not timed:
        print()
        print("=" * 60)
        print("TESTING REST ENDPOINTS (GET)")
        print("=" * 60)
        print()
    
    # Filter endpoints that support GET
    get_endpoints = [ep for ep in rest_endpoints if 'GET' in ep['methods']]
    
    if not get_endpoints:
        if not timed:
            print("No GET endpoints found to test.")
        return
    
    if not timed:
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
                            success_count += 1
                            if not timed:
                                print(f"✓ [{ep['type']}] {ep['entity']}")
                                print(f"  URL: {url}")
                                print(f"  Response: {data}")
                        except Exception:
                            # Try as text if JSON parsing fails
                            text = await response.text()
                            success_count += 1
                            if not timed:
                                print(f"✓ [{ep['type']}] {ep['entity']}")
                                print(f"  URL: {url}")
                                print(f"  Response: {text}")
                    else:
                        fail_count += 1
                        if not timed:
                            text = await response.text()
                            print(f"✗ [{ep['type']}] {ep['entity']} - FAILED")
                            print(f"  URL: {url}")
                            print(f"  Status: {response.status}")
                            print(f"  Response: {text}")
                    if not timed:
                        print()
            except asyncio.TimeoutError:
                fail_count += 1
                if not timed:
                    print(f"✗ [{ep['type']}] {ep['entity']} - TIMEOUT")
                    print(f"  URL: {url}")
                    print(f"  Error: Request timed out after 5 seconds")
                    print()
            except aiohttp.ClientError as e:
                fail_count += 1
                if not timed:
                    print(f"✗ [{ep['type']}] {ep['entity']} - CONNECTION ERROR")
                    print(f"  URL: {url}")
                    print(f"  Error: {e}")
                    print()
            except Exception as e:
                fail_count += 1
                if not timed:
                    print(f"✗ [{ep['type']}] {ep['entity']} - ERROR")
                    print(f"  URL: {url}")
                    print(f"  Error: {e}")
                    print()
    
    if not timed:
        print("=" * 60)
    print(f"TEST SUMMARY")
    if not timed:
        print("=" * 60)
    print(f"Total Tested:  {len(get_endpoints)}")
    print(f"Successful:    {success_count} \u2713")
    print(f"Failed:        {fail_count} \u2717")
    if not timed:
        print("=" * 60)
        print()


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python get_ids.py <host> [encryption_key] [password] [port] [--test] [--time] [--js <dir>] [--ts <dir>]")
        print("\nExamples:")
        print("  python get_ids.py 192.168.1.100")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key'")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' mypassword")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' mypassword 6053")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' '' 6053 --test")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' '' 6053 --time")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' --js ./dashboard")
        print("  python get_ids.py 192.168.1.100 'base64_encryption_key' --ts ./dashboard")
        print("\nNote: Encryption key is the API encryption key from ESPHome (noise_psk)")
        print("      Add --test flag to test all GET endpoints")
        print("      Add --time flag to time execution (summary output only)")
        print("      Add --js <dir> to generate a JavaScript web dashboard")
        print("      Add --ts <dir> to generate a TypeScript web dashboard")
        sys.exit(1)
    
    # Check for flags
    test_endpoints = '--test' in sys.argv
    timed = '--time' in sys.argv
    
    # Parse --js and --ts flags
    web_out = ""
    web_lang = ""
    argv_filtered = []
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == '--js' and i + 1 < len(sys.argv):
            web_lang = 'js'
            web_out = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--ts' and i + 1 < len(sys.argv):
            web_lang = 'ts'
            web_out = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] in ('--test', '--time'):
            i += 1
        else:
            argv_filtered.append(sys.argv[i])
            i += 1
    
    args = argv_filtered
    
    host = args[0]
    encryption_key = args[1] if len(args) > 1 else ""
    password = args[2] if len(args) > 2 else ""
    port = int(args[3]) if len(args) > 3 else 6053
    
    # Run the async function with timing
    start_time = time.perf_counter()
    success = asyncio.run(get_device_info(host, password, port, encryption_key, test_endpoints, timed, web_out, web_lang))
    elapsed = time.perf_counter() - start_time
    
    if timed:
        print(f"\nExecution Time: {elapsed:.3f}s")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
