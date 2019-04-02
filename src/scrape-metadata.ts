import puppeteer from "puppeteer";
import getRecords from "./records";

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const records = await getRecords();

    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;
        
        if (author.length > 0) continue;

        try
        {
            await page.goto(url, {waitUntil: "networkidle2"});
            
            const pageTitle = await page.$eval("title", title => title.innerHTML);
            const parts = pageTitle.split(" by ");
            
            const author = parts[parts.length - 1];

            if (parts.length > 1) parts.pop();

            const title = parts.join(" by ");

            console.log(`${author}`);
        }
        catch (e)
        {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            //console.log(e.message);
            continue;
        }

        //console.log(`${i} success ${boid} ${title} (${url})`);
    }

    await browser.close();
})();
