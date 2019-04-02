import fetch from "node-fetch";
import csv from "csv-parse/lib/sync";

export default async function getRecords()
{
    const response = await fetch("https://docs.google.com/spreadsheets/d/1eBUgCYOnMJ9REHuZdTodc6Ft2Vs6JXbH4K-bIgL9TPc/gviz/tq?tqx=out:csv&sheet=Bitsy");
    const content = await response.text();
    const records = csv(content, {skip_empty_lines: true}) as string[][];
    records.splice(0, 1);

    return records;
}
