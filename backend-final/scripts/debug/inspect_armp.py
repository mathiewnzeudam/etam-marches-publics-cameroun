import httpx
iframe_url = 'https://pridesoft.armp.cm//0903_dao_dl?type_publication=ADDITIF&id_publication=16813'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://armp.cm/'
}
with httpx.Client(follow_redirects=True, timeout=30, headers=headers) as client:
    r = client.get(iframe_url)
    print('iframe status', r.status_code)
    print('iframe headers', r.headers)
    print('iframe text', r.text)
    print('history', [h.status_code for h in r.history])
    import re
    m = re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', r.text, re.IGNORECASE)
    if not m:
        raise SystemExit('no iframe src')
    doc_url = m.group(1).strip()
    print('doc_url', doc_url)
    print('doc_url->', client.base_url, 'cookies', client.cookies)
    dr = client.get(doc_url)
    print('doc status', dr.status_code)
    print('doc headers', dr.headers)
    print('doc history', [h.status_code for h in dr.history])
    print('doc content first 400', dr.text[:400])
