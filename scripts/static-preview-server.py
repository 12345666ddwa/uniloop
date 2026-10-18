#!/usr/bin/env python3
"""本地模拟 Netlify：publish=public + /* -> /v3/index.html（200）"""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
os.chdir(ROOT)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        raw = self.path.split('?', 1)[0]
        if raw.startswith('/api/') or raw.startswith('/_sym/'):
            self.send_response(404); self.send_header('Content-Type', 'text/plain'); self.end_headers()
            self.wfile.write(b'Not found'); return
        path = self.translate_path(raw)
        if (not os.path.exists(path)) or (os.path.isdir(path) and not os.path.exists(os.path.join(path, 'index.html'))):
            self.path = '/v3/index.html'
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3700
    print('serving %s on %d (SPA fallback -> /v3/index.html)' % (ROOT, port))
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
