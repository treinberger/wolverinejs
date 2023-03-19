const fs = require('fs');
const { exec } = require('child_process');
const diff = require('diff');
const { Configuration, OpenAIApi } = require("openai");
const chalk = require('chalk');

const configuration = new Configuration({
  apiKey: fs.readFileSync('openai_key.txt', 'utf-8').trim(),
});
const openai = new OpenAIApi(configuration);

async function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath} ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ output: stderr, returncode: error.code });
      } else {
        resolve({ output: stdout, returncode: 0 });
      }
    });
  });
}

async function sendErrorToGpt4(file_path, args, error_message) {
  const file_lines = fs.readFileSync(file_path, 'utf-8').split('\n');

  let file_with_lines = '';
  for (let i = 0; i < file_lines.length; i++) {
    file_with_lines += `${i + 1}: ${file_lines[i]}\n`;
  }

  const initial_prompt_text = fs.readFileSync('prompt.txt', 'utf-8');

  const prompt = `${initial_prompt_text}\n\nHere is the script that needs fixing:\n\n${file_with_lines}\n\nHere are the arguments it was provided:\n\n${args}\n\nHere is the error message:\n\n${error_message}\nPlease provide your suggested changes, and remember to stick to the exact format as described above.`;

  const response = await openai.createChatCompletion({
    //model: 'gpt-4',
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 1.0,
  });

  return response.data.choices[0].message.content.trim();
}

function applyChanges(file_path, changes_json) {
  const original_file_lines = fs.readFileSync(file_path, 'utf-8').split('\n');
  const changes = JSON.parse(changes_json);

  const operation_changes = changes.filter((change) => 'operation' in change);
  const explanations = changes.filter((change) => 'explanation' in change).map((change) => change.explanation);

  operation_changes.sort((a, b) => b.line - a.line);

  const file_lines = [...original_file_lines];
  for (const change of operation_changes) {
    const { operation, line, content } = change;

    if (operation === 'Replace') {
      file_lines[line - 1] = `${content}\n`;
    } else if (operation === 'Delete') {
      file_lines.splice(line - 1, 1);
    } else if (operation === 'InsertAfter') {
      file_lines.splice(line, 0, `${content}\n`);
    }
  }

  fs.writeFileSync(file_path, file_lines.join(''));

  console.log(chalk.blue('Explanations:'));
  for (const explanation of explanations) {
    console.log(chalk.blue(`- ${explanation}`));
  }

  console.log('\nChanges:');
  const diffResult = diff.createPatch('', original_file_lines.join(''), file_lines.join(''), '', '', { context: 0 });
console.log(diffResult);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node wolverine.js <script_name> <arg1> <arg2> ... [--revert]');
    process.exit(1);
  }

  const script_name = args[0];
  const script_args = args.slice(1);

  if (script_args.includes('--revert')) {
    const backup_file = script_name + '.bak';
    if (fs.existsSync(backup_file)) {
      fs.copyFileSync(backup_file, script_name);
      console.log(`Reverted changes to ${script_name}`);
      process.exit(0);
    } else {
      console.log(`No backup file found for ${script_name}`);
      process.exit(1);
    }
  }

  fs.copyFileSync(script_name, script_name + '.bak');

  while (true) {
    const { output, returncode } = await runScript(script_name, script_args);

    if (returncode === 0) {
      console.log(chalk.blue('Script ran successfully.'));
      console.log('Output:', output);
      break;
    } else {
      console.log(chalk.blue('Script crashed. Trying to fix...'));
      console.log('Output:', output);

      const json_response = await sendErrorToGpt4(script_name, script_args, output);
      applyChanges(script_name, json_response);
      console.log(chalk.blue('Changes applied. Rerunning...'));
    }
  }
}

main();
