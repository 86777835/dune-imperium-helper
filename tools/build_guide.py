#!/usr/bin/env python3
"""Generate a committed static guide. No runtime build step; stdlib only."""
import json,html,re,sys
from pathlib import Path
source=Path(sys.argv[1] if len(sys.argv)>1 else 'tools/讲解稿.md')
out=Path(sys.argv[2] if len(sys.argv)>2 else 'public/guide.html')
faq=json.loads(Path(sys.argv[3] if len(sys.argv)>3 else 'tools/faq.json').read_text())
e=html.escape
parts=[]
for chunk in source.read_text().split('\n\n'):
 if chunk.startswith('# '):continue
 if chunk.startswith('## '):parts.append('<h3'+(' id="rivals"' if '单人和双人' in chunk else '')+'>'+e(chunk[3:])+'</h3>')
 else:parts.append('<p>'+e(chunk)+'</p>')
header=Path('public/index.html').read_text().split('</head>')[0].replace('<title>沙丘：帝国助手</title>','<title>教程与 FAQ · 沙丘助手</title>')+'</head>'
body='''<body><header><a class="back-nav" href="/">‹ 返回</a><p class="eyebrow">FIELD GUIDE</p><h1>上桌前，读这一份</h1></header><main><img class="guide-hero" src="/img/tutorial.jpg" alt="原创沙漠旅人插画"><nav class="links"><a href="#tutorial">新手教程</a><a href="#faq">常见问题</a><a href="https://www.direwolfdigital.com/game-room/">官方 Companion</a></nav><section class="article" id="tutorial">'''+''.join(parts)+'''</section><section id="faq"><p class="eyebrow">查规则 / 带着版本查</p><h2>常见问题</h2><div class="guide-filter"><label>版本或扩展<select id="filter"><option value="">全部</option>'''+''.join('<option>'+e(t)+'</option>' for t in dict.fromkeys(f['tag'] for f in faq))+'''</select></label><label>关键词<input id="search" type="search" placeholder="如：平局、沙虫"></label></div><p id="count" class="note"></p>'''
for f in faq:body+='<details class="faq-item" data-tag="'+e(f['tag'])+'"><summary><span class="tag">'+e(f['tag'])+' · '+e(f['cat'])+'</span>'+e(f['q'])+'</summary><p>'+e(f['a'])+'</p><a class="source" href="'+e(f['url'])+'" target="_blank" rel="noopener">'+e(f['source'])+' ↗</a></details>'
body+='''</section><footer>本站用自己的话整理规则。未收录的特殊卡牌请查规则书。<br>官方封面版权归原出版方；教程插画为原创。</footer></main><script type="module" src="/guide.js"></script><script type="module" src="/chat.js"></script></body></html>'''
out.write_text(header+body)
