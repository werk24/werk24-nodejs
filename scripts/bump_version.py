#
# When called, this small script checks for the most recent version of the
# W24TechreadClient (python) and updates the local version numbers
#
from dataclasses import dataclass
from typing import Optional

import re
import subprocess
import urllib.request


VERSION_PAGE = "https://raw.githubusercontent.com/werk24/werk24-python/master/werk24/_version.py"
""" Location of the most recent version number """

VERSION_PATTERN = r"__version__\s*=\s*\"(?P<version>[0-9.]+)(rc(?P<candidate>[0-9]))?\""
""" Regular expression to interpret the __version__ declaration """


@dataclass
class Version:
    """ Small helper class to track the version and
    extress it in different formats.
    """

    version: str
    """ version string (e.g., 0.5.0) """

    release_candidate: Optional[str]
    """ rc string (e.g., 1)"""

    @property
    def python_version(self) -> str:
        """ Get the version string in a python format

        Returns:
            str: version string in python format
        """
        if self.release_candidate:
            return f"{self.version}rc{self.release_candidate}"
        else:
            return self.version

    @property
    def nodejs_version(self) -> str:
        """ Get the version string in a nodejs verison

        Returns:
            str: version string in nodejs format
        """
        if self.release_candidate:
            return f"{self.version}-{self.release_candidate}"
        else:
            return self.version


def get_version() -> Version:
    """ Helper function to obtain the most recent version number
    """

    # get the version string
    page = urllib.request.urlopen(VERSION_PAGE)
    version_string = page.read().decode("utf-8")

    # try to interpete the version string
    version_match = re.match(VERSION_PATTERN, version_string)
    if not version_match:
        raise Exception("Unable to parse __version__ string")

    # return the tuple
    return Version(
        version=version_match.group('version'),
        release_candidate=version_match.group('candidate'))


def bump_nodejs_version(version: Version) -> None:
    """ Bump the current nodejs version to
    the version to $version

    Args:
        version (Version): new version
    """
    subprocess.call(
        ["npm", "version", version.nodejs_version, '--allow-same-version'])


def bump_requirements_version(version: Version) -> None:
    """ Update the requirements.txt
    to contain the new version number

    NOTE: this overrides the requirements.txt
        completely; which is find for the time
        being, as we only require the werk24
        client. We'd need to update this method
        should that ever change.

    Args:
        version (Version): new version
    """
    # make the werk24 line
    with open("./requirements.txt", "w") as file_handle:
        file_handle.write(f"werk24=={version.python_version}")


if __name__ == '__main__':
    version = get_version()
    bump_nodejs_version(version)
    bump_requirements_version(version)
