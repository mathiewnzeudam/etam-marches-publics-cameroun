import urllib.request, urllib.error, ssl
iframe_url = 'https://pridesoft.armp.cm//0903_dao_dl?type_publication=ADDITIF&id_publication=16813'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://armp.cm/'
}
ctx = ssl.create_default_context()
req = urllib.request.Request(iframe_url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
        html = r.read().decode('utf-8', errors='replace')
        print('iframe status', r.status)
        print('iframe content-type', r.getheader('Content-Type'))
        print('iframe length', len(html))
        print('iframe head', html[:400])
except Exception as e:
    print('iframe error', type(e).__name__, e)
    raise

# Extract doc_url
import re
m = re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
if not m:
    raise SystemExit('no iframe src')
doc_url = m.group(1).strip()
print('doc_url', doc_url)

req2 = urllib.request.Request(doc_url, headers={**headers, 'Referer': iframe_url})
try:
    with urllib.request.urlopen(req2, context=ctx, timeout=20) as r2:
        print('doc status', r2.status)
        print('doc content-type', r2.getheader('Content-Type'))
        data = r2.read(1000)
        print('doc data', data[:500])
except urllib.error.HTTPError as e:
    print('doc HTTPError', e.code, e.reason)
    try:
        body = e.read(500)
        print('body', body)
    except Exception as be:
        print('body error', be)
except Exception as e:
    print('doc error', type(e).__name__, e)
