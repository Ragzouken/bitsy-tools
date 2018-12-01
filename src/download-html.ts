import puppeteer from "puppeteer";
import fetch from "node-fetch";
import fse from "fs-extra";
import {URL} from "url";
import path from "path";
import csv from "csv-parse/lib/sync";

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

        if (response.status() == 207)
        {
            console.log(`hmm ${response.url()}`);
        }

        try
        {
            await fse.outputFile(filePath, await response.buffer());

            return;
        }
        catch (e)
        {
            console.log(`problem with response ${response.url()} (${response.status()}: ${response.statusText()})`);    
        }

        try 
        {
            await fse.outputFile(filePath, await fetch(response.url()).then(r => r.buffer()));
        }
        catch (e)
        {
            console.log(`failed ${response.url()}`);
            console.log(e);
        }
    });

    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.close();
}

async function findGameURL(page: puppeteer.Page, url: string): Promise<string>
{
    await page.goto(url, {waitUntil: "networkidle2"});
    await page.$eval(".load_iframe_btn", button => (button as HTMLButtonElement).click())
    .catch(error => undefined);
    
    const iframe = await page.$eval("iframe", frame => (frame as HTMLIFrameElement).src)
                    .catch(error => undefined);
    
    return iframe || url;
}  

async function scrapeGame(browser: puppeteer.Browser, url: string, boid: string)
{
    const page = await browser.newPage();

    try
    {
        const game = await findGameURL(page, url);
        
        await scrape(browser, game, boid);
    }
    finally
    {
        await page.close();
    }
}

(async () => {
    const response = await fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt");
    const content = await response.text();
    const browser = await puppeteer.launch();

    const records = csv(content, {skip_empty_lines: true}) as string[][];

    if (process.argv[2])
    {
        records.splice(0, records.length);
        records.push(["TEST", "", "test", "", process.argv[2]]);
    }
    console.log(records.length);

    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;

        try
        {
            await scrapeGame(browser, url, boid);
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
