#!/usr/bin/env python3
"""Commonplace study server — serves the Mechanical folder and injects the study layer
(bookmarks / highlights / annotations) into every HTML page. No source files are modified."""
import http.server, os, sys, socketserver

PORT = 8137
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
TAG = b'<script src="/__cp/extras.js" defer></script>'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_GET(self):
        clean = self.path.split('?', 1)[0].split('#', 1)[0]
        if clean.startswith('/__cp/'):
            fn = os.path.join(HERE, os.path.basename(clean))
            if os.path.isfile(fn):
                with open(fn, 'rb') as f: data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/javascript; charset=utf-8')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_error(404)
            return
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        if path.lower().endswith(('.html', '.htm')) and os.path.isfile(path):
            with open(path, 'rb') as f: data = f.read()
            if b'</body>' in data:
                data = data.replace(b'</body>', TAG + b'</body>', 1)
            else:
                data += TAG
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()
    def log_message(self, fmt, *args):
        pass  # keep the console quiet

if __name__ == '__main__':
    if not os.path.isfile(os.path.join(ROOT, 'index.html')):
        print('No index.html in', ROOT); sys.exit(1)
    print(f'Commonplace study server\n  Serving: {ROOT}\n  Open:    http://localhost:{PORT}/\n  (Close this window to stop.)')
    with socketserver.ThreadingTCPServer(('', PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        httpd.serve_forever()
