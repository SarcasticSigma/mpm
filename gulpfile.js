// TODO: Support storing mods in directories for grouping (enumerate and copy recursively)
// TODO: If hash of mods or config changes, create a changelog file from a diff of current v previous modlist/configlist

const fs = require('fs');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);
const {src, dest, series} = require('gulp');
const rename = require('gulp-rename');
require('dotenv').config();
console.log(process.env);

let buildNumber;
let newName;
let versionMajor = 0;
let versionMinor = 0;

let groupPath = `C:/Users/${process.env.USER}/AppData/Roaming/PolyMC/instances/instgroups.json`;
let basePath = `C:/Users/${process.env.USER}/AppData/Roaming/PolyMC/instances/SC3-Myriad`;

async function pWrap(pipe){
    return new Promise((resolve, reject) => {
        pipe.on('end', resolve).on('error', reject);
    });

}

async function loadMods(cb) {
    const del = (await import('del')).deleteAsync;
    await del(`./build/`, {force: true});

    await pWrap(src('mods/*.global', {encoding: false}).pipe(dest('build/server/mods/')).pipe(dest('build/client/mods')));
    await pWrap(src('mods/*.client', {encoding: false}).pipe(dest('build/client/mods')));
    await pWrap(src('mods/*.server', {encoding: false}).pipe(dest('build/server/mods/')));

    for(let filePattern of ['*.global', '*.client', '*.server']){
        for(let agent of ['server', 'client']){
            await pWrap(src(`build/${agent}/mods/${filePattern}`, {encoding: false}).pipe(rename((path) => {
                let ext = path.basename.slice(path.basename.search(/\..*$/));
                path.basename = path.basename.replace(ext, '');
                path.extname = ext;
            })).pipe(dest(`build/${agent}/mods/`))
            );
        }
    }

    await del(`./build/**/*.global`, {force: true});
    await del(`./build/**/*.client`, {force: true});
    await del(`./build/**/*.server`, {force: true});
    cb();
}

function loadConfig(cb) {
    src('config/*.global', {encoding: false}).pipe(dest('build/server/config/')).pipe(dest('build/client/config'));
    src('config/*.client', {encoding: false}).pipe(dest('build/client/config'));
    src('config/*.server', {encoding: false}).pipe(dest('build/server/config/'));
    cb();
}

function loadProperties(cb) {
    src('./assets/server.properties', {encoding: false}).pipe(dest('build/server/'));
    cb();
}

function loadOptions(cb) {
    cb();
}

function buildServer(cb) {
    cb();
}


async function buildClient(cb) {
    const del = (await import('del')).deleteAsync;

    let srcPath = basePath + '/**/*';
    let destPath = basePath + '-' + [versionMajor, versionMinor, buildNumber].join('.');

    await new Promise((resolve, reject) => {
        src(srcPath, {dot: true, encoding: false}).pipe(dest(destPath)).on('end', resolve).on('error', reject);
    });

    let clientPath = `${destPath}/.minecraft/`;

    let instanceName = await updateInstanceName(destPath);
    await groupInstance(instanceName);


    // Deleting mods and config folders in clientPath
    await del(`${clientPath}mods/`, {force: true});
    await del(`${clientPath}config/`, {force: true});

    src('./build/client/**', {encoding: false}).pipe(dest(clientPath));

    let startOutput = await exec(`C:\\Users\\${process.env.USER}\\AppData\\Local\\Programs\\PolyMC\\polymc.exe -l "${newName}"`);
    cb();
}

async function groupInstance(instanceName) {
    // Backup the groups
    await new Promise((resolve,reject)=> {
        src(groupPath, {encoding: false}).pipe(dest(groupPath + '.bak')).on('end', resolve).on('error', reject);
    });

    let groupInfo = await fs.promises.readFile(groupPath, {encoding: 'utf-8'});
    let groupData = JSON.parse(groupInfo);
    groupData.groups.BuildGroup.instances.push(instanceName);
    await fs.promises.writeFile(groupPath, JSON.stringify(groupData, null, 4), {encoding: 'utf-8'});
}

async function updateInstanceName(destPath) {
    let instanceInfo = await fs.promises.readFile(destPath + "/instance.cfg", {encoding: 'utf-8'});
    instanceInfo = instanceInfo.replace(/SC3-Myriad$/mg, newName)
    await fs.promises.writeFile(destPath + "/instance.cfg", instanceInfo, {encoding: 'utf-8'});
    return newName;
}

async function init(cb) {
    if (!(await fileExists('build.txt'))) {
        await fs.promises.writeFile('build.txt', "1");
    }
    buildNumber = parseInt(await fs.promises.readFile("build.txt", {encoding: 'utf-8'}));
    await fs.promises.writeFile('build.txt', String(buildNumber + 1) );
    newName = 'SC3-Myriad-' + [versionMajor, versionMinor, buildNumber].join('.');
    cb();
}


async function fileExists(path) {
    return fs.promises.access(path, fs.constants.F_OK).then(() => true).catch(() => false);
}

exports.default = series(init, loadMods, loadConfig, loadProperties, buildClient);