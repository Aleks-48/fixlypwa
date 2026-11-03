import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('../artifacts/qa-2026-09-26');
const results = JSON.parse(fs.readFileSync(path.join(dir,'browser-results.json'),'utf8'));
if(results.some(item=>!item.ok)) throw Error('Browser acceptance has failures');
const names = {
  'chairman-dashboard.png':'Председатель · свой дом',
  'chairman-finance.png':'Председатель · финансы',
  'chairman-documents.png':'Председатель · документы',
  'chairman-polls.png':'Председатель · опросы',
  'resident-payments.png':'Житель · финансы',
  'resident-documents.png':'Житель · документы',
  'resident-requests.png':'Житель · заявки',
  'resident-receipt.png':'Житель · квитанция',
  'master-dashboard.png':'Мастер · реальные заказы',
  'master-portfolio.png':'Мастер · сохранённое портфолио',
  'master-offers.png':'Мастер · отправленный отклик',
};
const screenshots=[...new Set(results.flatMap(item=>item.screenshot?[item.screenshot]:[]))];
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixly · техническая приёмка</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f8f6ef;color:#272c24;font:16px/1.55 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:40px 24px}h1{font-size:38px;line-height:1.15;margin:16px 0}.tag{color:#6b7946;font-weight:700;letter-spacing:.08em}.summary{padding:24px;border:1px solid #d8ddcc;background:#fff;border-radius:20px;margin:24px 0}.metrics{display:flex;gap:20px;flex-wrap:wrap}.metrics strong{font-size:26px;color:#697948}a{color:#506230}figure{margin:28px 0;border:1px solid #deded4;background:white;border-radius:18px;overflow:hidden}figcaption{padding:16px 22px;font-weight:700}img{display:block;width:100%;height:auto;border-top:1px solid #eee}nav{display:flex;gap:12px;flex-wrap:wrap}nav a{padding:8px 14px;background:#ebeedf;border-radius:20px;text-decoration:none}.note{color:#656b5f;font-size:14px}footer{margin:32px 0}</style>
<main><span class="tag">FIXLY / 26 СЕНТЯБРЯ 2026</span><h1>Три роли. Реальные проверки.</h1><p>Скриншоты локального сайта в Edge. Использованы отдельные тестовые аккаунты и дом.</p>
<section class="summary"><div class="metrics"><div><strong>3 / 3</strong><br>вход по ролям</div><div><strong>${results.length} / ${results.length}</strong><br>браузерных проверок</div><div><strong>0</strong><br>уязвимостей npm</div><div><strong>33</strong><br>таблицы с изоляцией ОСИ</div></div><p class="note">100% относится к перечисленным проверкам, а не ко всем функциям или готовности к коммерческому запуску.</p></section>
<nav><a href="#chairman">Председатель</a><a href="#resident">Житель</a><a href="#master">Мастер</a><a href="report.md">Полный отчёт</a><a href="browser-results.json">Результаты JSON</a></nav>
${screenshots.map((file,index)=>`<figure ${index===0?'id="chairman"':file==='resident-payments.png'?'id="resident"':file==='master-dashboard.png'?'id="master"':''}><figcaption>${names[file]??file}</figcaption><a href="${file}"><img src="${file}" loading="lazy" alt="${names[file]??file}"></a></figure>`).join('')}
<footer class="note">Production и Android debug-сборки проверяются отдельно. Установка APK на физический телефон и проверка push на устройстве в этот прогон не входили. Ngrok работает, пока запущены компьютер и сервисы.</footer></main></html>`;
fs.writeFileSync(path.join(dir,'index.html'),html);
fs.copyFileSync('../docs/technical-acceptance-2026-09-26.md',path.join(dir,'report.md'));
console.log('Gallery generated: '+screenshots.length+' screenshots, '+results.length+' passed checks.');
