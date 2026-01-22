from typing import Any


class RulesDetector:
    def __init__(self):
        self.linting_configs = {
            "ESLint": [".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yaml"],
            "Prettier": [
                ".prettierrc",
                ".prettierrc.js",
                ".prettierrc.json",
                ".prettierrc.yaml",
            ],
            "Ruff": ["ruff.toml", ".ruff.toml"],
            "Black": ["pyproject.toml"],  # check content for [tool.black]
            "Mypy": [
                "mypy.ini",
                ".mypy.ini",
                "pyproject.toml",
            ],  # check content for [tool.mypy]
            "Pytest": [
                "pytest.ini",
                "pyproject.toml",
            ],  # check content for [tool.pytest]
        }

        self.bots = {
            "dependabot[bot]",
            "renovate[bot]",
            "codecov[bot]",
            "github-actions[bot]",
            "stale[bot]",
            "vercel[bot]",
            "snyk-bot",
            "semantic-release-bot",
        }

    def detect_linting_tools(
        self, files: list[dict[str, Any]], file_content_getter
    ) -> list[dict[str, str]]:
        """
        Detects linting and formatting tools based on file existence and content.
        `file_content_getter` is an async function to fetch content if needed (e.g. pyproject.toml).
        For now, we'll just check filenames for simplicity, and maybe content for pyproject.toml if available.
        """
        detected_tools = []
        file_names = {
            f["path"].split("/")[-1] for f in files
        }  # flatten path to filename

        for tool, configs in self.linting_configs.items():
            for config in configs:
                if config in file_names:
                    detected_tools.append({"name": tool, "config_file": config})
                    break

        return detected_tools

    def detect_ci_checks(self, workflows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Parses GitHub Actions workflows/content to identify required checks.
        Expected input: List of dicts with 'name', 'path', and optional 'content' (if we fetched it)
        """
        checks = []
        for workflow in workflows:
            name = workflow.get(
                "name", str(workflow.get("path", "Unknown")).split("/")[-1]
            )
            checks.append(
                {
                    "name": name,
                    "type": "GitHub Action",
                    "file": workflow.get("path"),
                    "description": "Automated workflow",
                }
            )
        return checks

    def detect_bots(
        self, prs: list[dict[str, Any]], issues: list[dict[str, Any]]
    ) -> list[str]:
        """
        Identifies bots active in PRs and Issues.
        """
        active_bots = set()

        for pr in prs:
            user = pr.get("user", {}).get("login", "")
            if user in self.bots or user.endswith("[bot]"):
                active_bots.add(user)

        for issue in issues:
            user = issue.get("user", {}).get("login", "")
            if user in self.bots or user.endswith("[bot]"):
                active_bots.add(user)

        return list(active_bots)

    def generate_checklist(
        self, tools: list[dict[str, str]], checks: list[dict[str, Any]]
    ) -> list[str]:
        checklist = [
            "Read the CONTRIBUTING.md file (if it exists).",
            "Fork the repository and create a new branch.",
        ]

        for tool in tools:
            checklist.append(f"Ensure code passes {tool['name']} checks.")

        if checks:
            checklist.append("Ensure all CI checks pass before merging.")

        return checklist


rules_detector = RulesDetector()
