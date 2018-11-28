import puppeteer from "puppeteer";
import fetch from "node-fetch"; 
import fs from "fs";
import csv from "csv-parse/lib/sync";

function findavatar(input: string): string
{
    return input.match(/SPR A\n([01>\n]+)\n/)![0];
}

(async () => {
    const response = await fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt");
    const content = await response.text();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const records = csv(content, {skip_empty_lines: true}) as string[][];
    console.log(records.length);

    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;

        try
        {
            await page.goto(url);
            await page.$eval(".load_iframe_btn", button => (button as HTMLButtonElement).click()).catch(error => undefined);
            
            const iframe = await page.$eval("iframe", frame => (frame as HTMLIFrameElement).src)
                                 .catch(error => undefined);
            
            if (iframe)
            {
                await page.goto(iframe).catch(error => console.log("can't enter iframe"));
            }

            let data = "#no data";

            try
            {
                data = await page.$eval("#exportedGameData", data => data.innerHTML);
            }
            catch (e)
            {
                // TODO: can't assume it's the first script tag...
                data = await page.$eval("script", script => script.innerHTML);
                data = data.match(/var exportedGameData = "(.*)";\n/)![1];
                data = data.replace(/\\n/g, "\n");
            }

            fs.writeFile(`./bitsies/${boid}.bitsy.txt`, data, () => {});
        }
        catch (e)
        {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            console.log(e.message);
        }
    }

    await browser.close();
})();
