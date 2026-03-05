const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

// Task 1:

axios.get('https://bulletin.du.edu/undergraduate/coursedescriptions/comp/')
  .then(response => {
    const $ = cheerio.load(response.data);
    const courses = [];

    $('.courseblock').each((i, el) => {
      const titleText = $(el).find('.courseblocktitle').text();
      const descText  = $(el).find('.courseblockdesc').text();

      const codeMatch = titleText.match(/COMP[\s-](\d{4})/i);
      if (!codeMatch) return;
      if (parseInt(codeMatch[1]) < 3000) return;
      if (/prerequisite/i.test(descText)) return;

      const titleMatch = titleText.match(/COMP[\s-]\d{4}\s+([^.]+)/i);
      courses.push({
        course: `COMP-${codeMatch[1]}`,
        title: titleMatch ? titleMatch[1].trim() : ''
      });
    });

    fs.writeFileSync('results/bulletin.json', JSON.stringify({ courses }, null, 2));
    console.log(`Task 1 Ran: ${courses.length} courses saved.`);
  })
  .catch(error => console.error('Task 1 error:', error));



//  Task 2
axios.get('https://denverpioneers.com/index.aspx')
  .then(response => {
    const $ = cheerio.load(response.data);
    const events = [];

    let gameData = [];
    $('script').each((i, el) => {
      if (gameData.length) return;
      const src = $(el).html() || '';
      if (!src.includes('"game_pregame_story_id"')) return;

      const fieldIdx = src.indexOf('"game_pregame_story_id"');
      for (let start = fieldIdx; start >= 0; start--) {
        if (src[start] !== '[') continue;

        let depth = 0, end = -1, inStr = false, esc = false;
        for (let j = start; j < src.length; j++) {
          const c = src[j];
          if (esc) { esc = false; continue; }
          if (c === '\\' && inStr) { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '[') depth++;
          else if (c === ']' && --depth === 0) { end = j; break; }
        }
        if (end === -1) continue;

        try {
          const parsed = JSON.parse(src.substring(start, end + 1));
          if (Array.isArray(parsed) && parsed.length > 1 && parsed[0].opponent !== undefined) {
            gameData = parsed;
            break;
          }
        } catch(e) {}
      }
    });

    gameData
      .filter(g => g.type === 'upcoming' && g.sport && g.opponent)
      .forEach(g => {
        const d = new Date(g.date);
        const date = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
        events.push({
          duTeam: g.sport.short_title,
          opponent: g.opponent.title,
          date
        });
      });

    fs.writeFileSync('results/athletic_events.json', JSON.stringify({ events }, null, 2));
    console.log(`Task 2 Ran: ${events.length} events saved.`);
  })
  .catch(error => console.error('Task 2 error:', error));




// ── Task 3:
axios.get('https://www.du.edu/calendar')
  .then(response => {
    const $ = cheerio.load(response.data);
    const events = [];

    $('.events-listing__item').each((i, el) => {
      const title = $(el).find('h3').text().trim();
      const dateText = $(el).find('p').first().text().trim();
      const timeEl = $(el).find('.icon-du-clock').parent();
      const time = timeEl.length ? timeEl.text().trim() : null;

      // Parse date and filter to 2025 only
      const date = new Date(`${dateText} 2025`);
      if (isNaN(date)) return;

      const event = { title, date: dateText };
      if (time) event.time = time;
      events.push(event);
    });

    fs.writeFileSync('results/calendar_events.json', JSON.stringify({ events }, null, 2));
    console.log(`Task 3 Ran: ${events.length} events saved.`);
  })
  .catch(error => console.error('Task 3 error:', error));
