"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const sync_1 = __importDefault(require("csv-parse/lib/sync"));
function findavatar(input) {
    return input.match(/SPR A\n([01>\n]+)\n/)[0];
}
(() => __awaiter(this, void 0, void 0, function* () {
    const response = yield node_fetch_1.default("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt");
    const content = yield response.text();
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    const records = sync_1.default(content, { skip_empty_lines: true });
    console.log(records.length);
    for (let i in records) {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;
        const path = `./bitsies/${boid}.bitsy.txt`;
        if (fs_1.default.existsSync(path))
            continue;
        try {
            yield page.goto(url, { waitUntil: "networkidle2" });
            yield page.$eval(".load_iframe_btn", button => button.click())
                .catch(error => undefined);
            const iframe = yield page.$eval("iframe", frame => frame.src)
                .catch(error => undefined);
            if (iframe) {
                yield page.goto(iframe, { waitUntil: "networkidle2" })
                    .catch(error => console.log("can't enter iframe"));
            }
            let data = "#no data";
            try {
                data = yield page.$eval("#exportedGameData", data => data.innerHTML);
            }
            catch (e) {
                // TODO: can't assume it's the first script tag...
                const scripts = yield page.$$eval("script", scripts => scripts.map(script => script.innerHTML));
                const pattern = /var exportedGameData = "(.*)";\n/;
                const matching = scripts.filter(script => script.match(pattern));
                if (matching.length == 1) {
                    data = matching[0].match(pattern)[1];
                    data = data.replace(/\\n/g, "\n");
                }
                else if (matching.length == 0) {
                    throw Error("No matching script tags.");
                }
                else if (matching.length >= 2) {
                    throw Error("Multiple matching script tags.");
                }
            }
            fs_1.default.writeFile(path, data, () => { });
        }
        catch (e) {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            console.log(e.message);
            continue;
        }
        console.log(`${i} success ${boid} ${title} (${url})`);
    }
    yield browser.close();
}))();
