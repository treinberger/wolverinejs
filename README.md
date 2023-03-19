# Wolverinejs

## About

This is a node/javascript version of https://github.com/biobootloader/wolverine/blob/main/README.md , kudos to @biobootloader! I created this with the help of GPT4 within about 30mins, which I asked to convert me the python script to a node script. The only challenge here was that GPT4 didn't spit out the whole script at once but rather cut off at some point, so I had to tell it to just assume that some functions are already there and then I was able to stitch the file together.

Also I made some manual changes to the openAPI calls because GPT-3.5 turbo's output was slightly incorrect with regards to extracting the response from the chat completion.

Give your node scripts regenerative healing abilities!

Run your scripts with Wolverine and when they crash, GPT3.5/GPT-4 edits them and explains what went wrong. Even if you have many bugs it will repeatedly rerun until it's fixed.

For a quick demonstration of the original python version of @biobootloader see this [demo video on twitter](https://twitter.com/bio_bootloader/status/1636880208304431104).

## Setup

- install node on your machine
- Add your openAI api key to `openai_key.txt`
- _warning!_ by default this uses GPT-3.5 turbo and may make many repeated calls to the api. change the model to gpt-4 once available through API and if desired

## Example Usage

    node wolverine.js sample.js