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
    const lines = content.split("\n");
    lines.splice(0, 1);
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    const records = sync_1.default(content, { skip_empty_lines: true });
    console.log(records.length);
    for (let i in records) {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;
        try {
            yield page.goto(url);
            yield page.$eval(".load_iframe_btn", button => button.click()).catch(error => undefined);
            const iframe = yield page.$eval("iframe", frame => frame.src)
                .catch(error => undefined);
            if (iframe) {
                yield page.goto(iframe).catch(error => console.log("can't enter iframe"));
            }
            let data = "#no data";
            try {
                data = yield page.$eval("#exportedGameData", data => data.innerHTML);
            }
            catch (e) {
                data = yield page.$eval("script", script => script.innerHTML);
                data = data.match(/var exportedGameData = "(.*)";\n/)[1];
                data = data.replace(/\\n/g, "\n");
            }
            fs_1.default.writeFile(`./bitsies/${boid}.bitsy.txt`, data, () => { });
        }
        catch (e) {
            console.log(`${i} failed ${boid} ${title} (${url})`);
            console.log(e.message);
        }
    }
    yield browser.close();
}))();
