#!/usr/bin/env node

console.log("RUNNING");

const fs = require("fs");
const yaml = require("js-yaml");

const gen = (outstream, data) => {
  const outln = (str) => outstream.write(`${str}\n`);

  const colors = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,
    something: 38,
    default: 39,
  };

  const header = () => {
    outln("#!/usr/bin/env bash");
  };

  const colorCodes = () => {
    outln("\n### Colors ###");
    outln("ESC=$(printf '\\033')");
    outln(`RESET="\${ESC}[0m"`);

    Object.entries(colors).forEach(([color, code]) => {
      outln(color.toUpperCase() + `="\${ESC}[${code}m"`);
    });
  };

  const colorFunctions = () => {
    outln("\n### Color Functions ###");
    Object.keys(colors).forEach((color) => {
      const fname = `${color}Print`;
      const upper = color.toUpperCase();
      outln(`${fname}() { printf "\${${upper}}%s\${RESET}\" "$1"; }`);
    });
  };

  const messageFunctions = (messages) => {
    outln("\n### Message Functions ###");
    const useMessages = Object.assign(
      {
        quit: "Good-Bye.",
        error: "Error In Selection.",
      },
      messages
    );
    outln(`fn_quit() { echo "${useMessages.quit}"; exit 0; }`);
    outln(`fn_error() { echo "${useMessages.error}"; exit 1; }`);
  };

  const functionize = (path, shortcut, label) => {
    const parts = ["fn"];
    if (path) {
      parts.push(path);
    }
    parts.push(shortcut);
    parts.push(label.replace(/[^a-zA-Z0-9]/g, ""));

    return parts.join("_");
  };

  const getFunc = (path = "", shortcut = 1, entry) => {
    if (entry.command) {
      return entry.command;
    }

    return functionize(path, shortcut, entry.title);
  };

  const optionCase = (shortcut, cmd1, cmd2 = "") => {
    outln(`    ${shortcut})`);
    outln(`        ${cmd1}`);
    if (cmd2) {
      outln(`        ${cmd2}`);
    }
    outln(`        ;;`);
  };

  const subMenuText = (parent, functionName, title, color, entries) => {
    entries.forEach((entry, i) => {
      const shortcut = i + 1;
      const nextFunctionName = functionize(parent, shortcut, title);
      subMenuFunction(functionName, nextFunctionName, shortcut, entry);
    });

    outln(`\n${functionName}() {`);
    outln('echo -ne "');
    outln(`$(${color}Print '${title}')`);

    entries.forEach((entry, i) => {
      const shortcut = i + 1;
      const color = entry?.color ?? "blue";
      const title = entry.title;
      outln(`$(${color}Print '${shortcut})') ${title}`);
    });

    if (parent) {
      outln(`$(bluePrint '..)') Previous Menu`);
    }
    outln(`$(redPrint 'q)') Quit`);

    outln('Choose an option:  "');
    outln("    read -r ans");
    outln("    case $ans in");

    entries.forEach((entry, i) => {
      const shortcut = i + 1;
      const func = getFunc(functionName, shortcut, entry);
      optionCase(shortcut, func, functionName);
    });
    if (parent) {
      optionCase("..", parent);
    }
    optionCase("q", "fn_quit");
    optionCase("*", "fn_error");

    outln("    esac");
    outln("}");
  };

  const subMenuFunction = (parent, functionName, shortcut, entry) => {
    if (!entry?.submenu) {
      return;
    }
    const color = entry.color ?? "blue";
    const title = entry.title ?? "anentry";
    const func = functionize(parent, shortcut, entry.title);

    subMenuText(parent, func, title, color, entry.submenu.entries);
  };

  const topMenu = (menu) => {
    const color = menu?.color ?? "magenta";
    const title = menu?.title ?? "Main Menu";

    subMenuText("", "mainMenu", title, color, menu.entries);

    outln("\nmainMenu");
  };

  header();
  colorCodes(data.colors);
  colorFunctions(data.colors);
  messageFunctions(data.messages);
  topMenu(data.menu);
};

const useWrite = (outfile, callback, ...rest) => {
  const ostream = fs.createWriteStream(outfile);

  callback(ostream, ...rest);

  ostream.end();
};

const main = function () {
  const context = process.argv[2];

  const infile = context ? `config-${context}.yml` : "config.yml";
  const outfile = context ? `bashmenu-${context}.bash` : "bashmenu.bash";

  const yamlData = yaml.load(fs.readFileSync(infile, "utf8"));

  useWrite(outfile, gen, yamlData);
};

main();
