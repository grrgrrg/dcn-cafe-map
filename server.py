#!/usr/bin/env python3
"""
Simple HTTP server for the DCN Cafe Map
Run this to view the map locally without CORS issues
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        return super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"🚀 DCN Cafe Map Server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()