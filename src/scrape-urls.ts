import puppeteer from "puppeteer";

(async () => {  
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const url = "https://itch.io/games/newest/made-with-bitsy";

    for (let i = 7; i >= 0; --i)
    {
        try
        {
            await page.goto(`${url}?page=${i}`, {waitUntil: "networkidle2"});
            
            const cells = await page.$$eval(".thumb_link", cells => cells.map(cell => (cell as HTMLAnchorElement).href));
            
            console.log(cells.reverse().join("\n"));
        }
        catch (e)
        {
            console.log(e.message);
        }
    }

    await browser.close();
})();
