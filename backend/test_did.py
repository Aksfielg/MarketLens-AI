import requests, time

KEY = 'cmlzaHU3NDY2a3VtYXJAZ21haWwuY29t:yzEBUcp9puaagU992HM-8'
headers = {'Authorization': 'Basic ' + KEY, 'Content-Type': 'application/json'}
talk_id = 'tlk_jdA-eTT3PXMnTHpla1eYQ'

for i in range(12):
    r = requests.get('https://api.d-id.com/talks/' + talk_id, headers=headers)
    d = r.json()
    status = d.get('status')
    url = d.get('result_url', 'N/A')
    print(i, 'Status:', status, '| URL:', url)
    if status in ['done', 'error']:
        break
    time.sleep(5)
