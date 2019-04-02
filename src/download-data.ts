import puppeteer from "puppeteer";
import fs from "fs";
import csv from "csv-parse/lib/sync";
import getRecords from "./records";

(async () => {
    const records = await getRecords();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;

        const path = `./bitsies/${boid}.bitsy.txt`;

        if (fs.existsSync(path)) continue;

        // note: https://fettblog.eu/scraping-with-puppeteer/

        try
        {
            await page.goto(url, {waitUntil: "networkidle2"});
            await page.$eval(".load_iframe_btn", button => (button as HTMLButtonElement).click())
            .catch(error => undefined);
            
            const iframe = await page.$eval("iframe", frame => (frame as HTMLIFrameElement).src)
                           .catch(error => undefined);
            
            if (iframe)
            {
                await page.goto(iframe, {waitUntil: "networkidle2"})
                .catch(error => console.log("can't enter iframe"));
            }

            let data = "#no data";

            try
            {
                data = await page.$eval("#exportedGameData", data => data.innerHTML);
            }
            catch (e)
            {
                const scripts = await page.$$eval("script", scripts => scripts.map(script => script.innerHTML));
                const pattern = /var exportedGameData = "(.*)";\n/;
                const matches = scripts.map(script => script.match(pattern))
                                       .filter(match => match);

                if (matches.length == 1)
                {
                    data = matches[0]![1];
                    data = data.replace(/\\n/g, "\n");
                }
                else if (matches.length == 0)
                {
                    throw Error("No matching script tags.");
                }
                else if (matches.length >= 2)
                {
                    throw Error("Multiple matching script tags.");
                }
            }

            fs.writeFile(path, data, () => {});
        }
        catch (e)
        {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            console.log(e.message);
            continue;
        }

        console.log(`${i} success ${boid} ${title} (${url})`);
    }

    await browser.close();
})();
