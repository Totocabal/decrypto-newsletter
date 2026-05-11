import { buildEmailHtml } from "./src/render/buildEmail.js";
import { INITIAL_STATE } from "./src/config/schema.js";
import { writeFileSync } from "fs";

const html = buildEmailHtml(INITIAL_STATE);
writeFileSync(process.argv[2] || "./decrypto-email.html", html, "utf8");
console.log("OK — wrote " + (process.argv[2] || "./decrypto-email.html") + " (" + html.length + " bytes)");
