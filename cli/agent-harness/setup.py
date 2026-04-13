from setuptools import find_namespace_packages, setup


setup(
    name="cli-anything-pastiche",
    version="0.1.0",
    description="CLI-Anything harness for the Pastiche snippets API",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    include_package_data=True,
    install_requires=[
        "click>=8.1.7",
        "httpx>=0.28.1",
        "prompt_toolkit>=3.0.48",
    ],
    extras_require={
        "dev": [
            "pytest>=8.3.5",
            "pytest-asyncio>=1.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "cli-anything-pastiche=cli_anything.pastiche.pastiche_cli:cli",
        ],
    },
)