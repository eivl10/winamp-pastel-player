import urllib.request, json, urllib.parse

def search_wiki(query):
    url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + urllib.parse.quote(query + ' filetype:video') + '&utf8=&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        return [item['title'] for item in data['query']['search'][:1]]
    except Exception as e:
        return str(e)

print('Surf:', search_wiki('surf'))
print('Boat:', search_wiki('river boat'))
print('Rain:', search_wiki('jungle rain'))
