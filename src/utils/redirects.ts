import { PUBLIC_PATH } from "../constants";
import * as fs from "fs"
import { getSiteInfo } from "../utils";

export function generateRedirects() {
    const {redirects} = getSiteInfo()
    
  fs.writeFileSync(`${PUBLIC_PATH}/vercel.json`, JSON.stringify({redirects,"cleanUrls": true},null,2));
}
