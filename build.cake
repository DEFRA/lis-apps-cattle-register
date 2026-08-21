#nullable enable
#load "version.cake"

var target = Argument("target", "Default");
var version = Argument("package_version", EnvironmentVariable("PACKAGE_VERSION") ?? "");
var imageName = Argument("image_name", EnvironmentVariable("IMAGE_NAME") ?? "");
var imageRef = Argument("image_ref", EnvironmentVariable("IMAGE_REF") ?? "");
var revision = Argument("revision", EnvironmentVariable("REVISION") ?? "");

string RequiredValue(string value, string name)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new Exception($"{name} is required to build the container image.");
    }

    return value;
}

Action buildContainerImage = () =>
{
    var resolvedImageName = RequiredValue(imageName, "IMAGE_NAME");
    var resolvedImageRef = string.IsNullOrWhiteSpace(imageRef)
        ? $"{resolvedImageName}:{version}"
        : imageRef;
    var resolvedRevision = RequiredValue(revision, "REVISION");
    var repository = EnvironmentVariable("GITHUB_REPOSITORY") ?? resolvedImageName;
    var serverUrl = EnvironmentVariable("GITHUB_SERVER_URL") ?? "https://github.com";
    var runId = EnvironmentVariable("GITHUB_RUN_ID") ?? "local";

    Information($"Building production container image {resolvedImageRef}");
    RunCommand(
        "docker",
        "buildx build . " +
        "--file ./Dockerfile " +
        "--target production " +
        "--no-cache --provenance=false --sbom=false --load " +
        $"--tag \"{resolvedImageRef}\" " +
        $"--label \"defra.cdp.git.repo.url={serverUrl}/{repository}\" " +
        $"--label \"defra.cdp.git.repo.name={repository}\" " +
        $"--label \"defra.cdp.service.name={resolvedImageName}\" " +
        $"--label \"defra.cdp.build.run_id={runId}\" " +
        "--label \"defra.cdp.run_mode=service\" " +
        $"--label \"git.hash={resolvedRevision}\" " +
        $"--label \"org.opencontainers.image.version={version}\"");
};

Task("Clean")
    .Description("Removes generated Cake output")
    .Does(() => CleanDirectory("./.cake/package"));

Task("Version")
    .IsDependentOn("Clean")
    .Description("Calculates the npm package version")
    .Does(() =>
    {
        if (string.IsNullOrWhiteSpace(version))
        {
            version = CalculateVersion();
        }

        Information($"Version {version}");
    });

Task("Install")
    .IsDependentOn("Version")
    .Description("Installs dependencies from package-lock.json")
    .Does(() => RunNpm("ci"));

Task("SecurityAudit")
    .IsDependentOn("Install")
    .Description("Audits dependencies")
    .Does(() => RunNpm("run security-audit"));

Task("Format")
    .IsDependentOn("SecurityAudit")
    .Description("Checks formatting without changing source files")
    .Does(() => RunNpm("run format:check"));

Task("Lint")
    .IsDependentOn("Format")
    .Description("Runs JavaScript linting")
    .Does(() => RunNpm("run lint"));

Task("Test")
    .IsDependentOn("Lint")
    .Description("Runs the Vitest test suite")
    .Does(() => RunNpm("test"));

Task("Build")
    .IsDependentOn("Test")
    .Description("Validates the syntax of package source files")
    .Does(() =>
    {
        foreach (var sourceFile in GetFiles("./src/**/*.js"))
        {
            RunNode($"--check \"{sourceFile}\"");
        }
    });

Task("Pack")
    .IsDependentOn("Build")
    .Description("Validates the application and builds its production container image")
    .Does(buildContainerImage);

Task("PackOnly")
    .IsDependentOn("Version")
    .Description("Builds the production container image from previously validated source")
    .Does(buildContainerImage);

Task("Default")
    .IsDependentOn("Pack");

RunTarget(target);
