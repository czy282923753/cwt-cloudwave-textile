const failures = [];
const major = Number(process.versions.node.split(".")[0]);
if (major !== 24) failures.push(`Node 24 is required; found ${process.version}`);
if (process.arch !== "arm64") failures.push(`ARM64 is required; found ${process.arch}`);
if (failures.length) throw new Error(`Unsupported runtime: ${failures.join("; ")}.`);
process.stdout.write(`Runtime accepted: ${process.version} ${process.platform} ${process.arch}.\n`);
