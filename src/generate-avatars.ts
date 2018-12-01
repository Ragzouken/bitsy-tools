import jimp from "jimp";
import fs from "fs";
import fetch from "node-fetch";
import csv from "csv-parse/lib/sync";

const white = jimp.rgbaToInt(255, 255, 255, 255);
const black = jimp.rgbaToInt(  0,   0,   0, 255);

function readTextFile(path: string): Promise<string>
{
    return new Promise(resolve =>
    {
        fs.readFile(path, "UTF-8", (err, text) =>
        {
            resolve(text);
        });
    });
}

async function loadBitsyData(boid: string): Promise<string>
{
    const path = `./bitsies/${boid}.bitsy.txt`;
    let text = await readTextFile(path);

    // TODO: need a real way to remove these horrid linebreaks
    if (text && text.match("\r"))
    {
        text = text.split("\n").map(line => line.trim()).join("\n");
    }

    return text;
}

function lineToColor(line: string): number
{
    const [r, g, b, ..._] = line.split(",").map(v => +v);

    return jimp.rgbaToInt(r, g, b, 255);
}

function extractPalettes(gamedata: string): Map<string, number[]>
{
    const regex = /PAL (\w+)\n(?:NAME .+\n)?((?:[\d, ]+\n)+)/g;
    const matches = gamedata.match(regex);
    const palettes = new Map<string, number[]>();

    if (!matches) return palettes;

    let result: RegExpExecArray | null;

    while (null !== (result = regex.exec(gamedata)))
    {
        const id = result[1];
        const colors = result[2].trim().split("\n")
                                .map(line => lineToColor(line));

        palettes.set(id, colors);
    }

    return palettes;
}

function extractAvatarFrames(gamedata: string): boolean[][]
{
    const match = gamedata.match(/SPR A\n([01>\n]+)/);
    const frames: boolean[][] = [];

    if (match)
    {
        const frameDatas = match[1].replace(/[^01>]/g, "").split(">");
        frameDatas.map(data => data.split("").map(v => v == "1"))
                  .forEach(frame => frames.push(frame));
    }

    return frames;
}

async function renderFrames(frames: boolean[][],
                            palette: number[]): Promise<jimp[]>
{
    const images = [];

    for (let frame of frames)
    {
        const image = await jimp.create(8, 8, 0);

        frame.forEach((value, index) =>
        {
            const x = index % 8;
            const y = Math.floor(index / 8);

            image.setPixelColor(value ? palette[2] : palette[0], x, y);
        });

        images.push(image);
    }

    return images;
}

async function collage(images: jimp[], columns = 35): Promise<jimp>
{
    const rows = Math.ceil(images.length / columns);  

    const collage = await jimp.create(columns * 8, rows * 8, black);

    images.forEach((image, i) =>
    {
        const x = i % columns;
        const y = Math.floor(i / columns);

        collage.blit(image, x * 8, y * 8);
    });

    return collage;
}

async function run()
{
    const response = await fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt");
    const content = await response.text();
    const records = csv(content, {skip_empty_lines: true}) as string[][];
    records.splice(0, 1);
    const images0: jimp[] = [];
    const images1: jimp[] = [];

    for (let i in records)
    {
        const line = records[i];
        const [boid, date, title, author, url, ...notes] = line;

        const gamedata = await loadBitsyData(boid);

        if (!gamedata)
        {
            console.log(`${boid} (${title}): no data`);
            continue;
        }

        try
        {
            const palettes = extractPalettes(gamedata);
            const frames = extractAvatarFrames(gamedata);

            if (!palettes.has("0"))
            {
                console.log(`${boid} (${title}): no palette 0`);
                continue;
            }

            const avatar = await renderFrames(frames, palettes.get("0")!);

            if (avatar.length >= 1)
            {
                images0.push(avatar[0]);
                images1.push(avatar[1] || avatar[0]);
            }
            else
            {
                console.log(`${boid} (${title}): no avatar`);
            }
        }
        catch (e)
        {
            console.log(`${boid} (${title}): bad data`);
            console.log(e);
        }
    }
    
    const collage0 = await collage(images0);
    const collage1 = await collage(images1);

    collage0.resize(collage0.getWidth() * 4,
                    collage0.getHeight() * 4,
                    jimp.RESIZE_NEAREST_NEIGHBOR);
    collage1.resize(collage1.getWidth() * 4,
                    collage1.getHeight() * 4,
                    jimp.RESIZE_NEAREST_NEIGHBOR);
    collage0.write("images/avatars0.png");
    collage1.write("images/avatars1.png");
}

run();
