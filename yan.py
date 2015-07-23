import urllib

response = urllib.urlopen('http://eco99fm.maariv.co.il/jwplayer/AudioWindow.aspx?id=3198')
html = response.read()
print(html)

local_file = open("jspro.htm", "w+")
local_file.write(html)
local_file.close()
