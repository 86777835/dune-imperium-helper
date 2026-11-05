const back=document.querySelector('.back-nav'),code=new URLSearchParams(location.search).get('r');
if(/^[A-Z0-9]{4}$/.test(code||''))back.href='/?r='+code;
const filter=document.querySelector('#filter'),search=document.querySelector('#search');
function update(){let n=0;for(const row of document.querySelectorAll('.faq-item')){const show=(!filter.value||row.dataset.tag===filter.value)&&(row.textContent.includes(search.value.trim()));row.hidden=!show;if(show)n++;}document.querySelector('#count').textContent=`找到 ${n} 条规则说明`;}
filter.onchange=update;search.oninput=update;update();
