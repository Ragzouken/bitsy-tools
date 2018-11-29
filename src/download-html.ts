import puppeteer from "puppeteer";
import fetch from "node-fetch";
import fse from "fs-extra";
import {URL} from "url";
import path from "path";
import csv from "csv-parse/lib/sync";

function findavatar(input: string): string
{
    return input.match(/SPR A\n([01>\n]+)\n/)![0];
}

async function scrape(browser: puppeteer.Browser,
                      url: string,
                      boid: string): Promise<void>
{
    const page = await browser.newPage();

    page.on('response', async (response) => 
    {
        const url = new URL(response.url());

        let filePath = path.resolve(`./sources/${boid}${url.pathname}`);

        if (path.extname(url.pathname).trim() === '') 
        {
            filePath = `${filePath}/index.html`;
        }

        await fse.outputFile(filePath, await response.buffer());
    });

    await page.goto(url, {waitUntil: 'networkidle2'});
    await page.close();
}

(async () => {
    const response = await fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt");
    const content = await response.text();

    const browser = await puppeteer.launch();
    
    const records = csv(content, {skip_empty_lines: true}) as string[][];
    console.log(records.length);

    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;

        const page = await browser.newPage();

        try
        {
            await page.goto(url, {waitUntil: "networkidle2"});
            await page.$eval(".load_iframe_btn", button => (button as HTMLButtonElement).click())
            .catch(error => undefined);
            
            const iframe = await page.$eval("iframe", frame => (frame as HTMLIFrameElement).src)
                           .catch(error => undefined);
            
            await scrape(browser, iframe || url, boid);
        }
        catch (e)
        {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            console.log(e.message);
            continue;
        }
        finally
        {
            await page.close();
        }

        console.log(`${i} success ${boid} ${title} (${url})`);
    }

    await browser.close();
})();
