import urllib.request, re, urllib.parse, ssl

ssl._create_default_https_context = ssl._create_unverified_context

def get_pexels_video(query):
    url = 'https://www.pexels.com/search/videos/' + urllib.parse.quote(query) + '/?orientation=landscape'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        links = re.findall(r'https://videos\.pexels\.com/video-files/[^\"\'>\s]+\.mp4', html)
        return links[0] if links else None
    except Exception as e:
        return str(e)

w = get_pexels_video('surfing ocean')
n = get_pexels_video('river boat')
s = get_pexels_video('jungle rain')

print('Weligama:', w)
print('Novi Sad:', n)
print('Sri Lanka:', s)

if w and not w.startswith('HTTP') and n and not n.startswith('HTTP') and s and not s.startswith('HTTP'):
    print('Downloading...')
    urllib.request.urlretrieve(w, 'assets/bg/weligama.mp4')
    urllib.request.urlretrieve(n, 'assets/bg/novisad.mp4')
    urllib.request.urlretrieve(s, 'assets/bg/srilanka.mp4')
    print('Done')
