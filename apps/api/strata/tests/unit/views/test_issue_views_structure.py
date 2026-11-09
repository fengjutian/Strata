# Copyright (c) 2023-present Strata Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Structural checks for the work item API views package.

Run with:

    cd apps/api && .venv/Scripts/python.exe -m pytest strata/tests/unit/views/test_issue_views_structure.py

The checks below guard the invariants that the split of
``strata/api/views/issue.py`` into a package must preserve:

* every endpoint is importable from the package and from ``strata.api.views``
* every endpoint is wired to a URL
* the module-level permission helpers stay importable from their old path
* no submodule imports a name it does not define (catches a missing import
  that would only surface at runtime)
"""

import ast
import importlib
import pkgutil
from pathlib import Path

import pytest

API_VIEWS = importlib.import_module("strata.api.views")
ISSUE_VIEWS = importlib.import_module("strata.api.views.issue")

ENDPOINTS = [
    "WorkspaceIssueAPIEndpoint",
    "IssueListCreateAPIEndpoint",
    "IssueDetailAPIEndpoint",
    "LabelListCreateAPIEndpoint",
    "LabelDetailAPIEndpoint",
    "IssueLinkListCreateAPIEndpoint",
    "IssueLinkDetailAPIEndpoint",
    "IssueCommentListCreateAPIEndpoint",
    "IssueCommentDetailAPIEndpoint",
    "IssueActivityListAPIEndpoint",
    "IssueActivityDetailAPIEndpoint",
    "IssueAttachmentListCreateAPIEndpoint",
    "IssueAttachmentDetailAPIEndpoint",
    "IssueSearchEndpoint",
    "IssueRelationListCreateAPIEndpoint",
]

PERMISSION_HELPERS = [
    "user_has_issue_permission",
    "is_active_project_member",
    "is_project_or_workspace_admin",
    "is_restricted_guest",
    "guest_cannot_view_issue",
    "visible_issue_q",
]

# Submodules of the package and the endpoints they own.
MODULE_OWNERSHIP = {
    "work_item": ["WorkspaceIssueAPIEndpoint", "IssueListCreateAPIEndpoint", "IssueDetailAPIEndpoint"],
    "label": ["LabelListCreateAPIEndpoint", "LabelDetailAPIEndpoint"],
    "link": ["IssueLinkListCreateAPIEndpoint", "IssueLinkDetailAPIEndpoint"],
    "comment": ["IssueCommentListCreateAPIEndpoint", "IssueCommentDetailAPIEndpoint"],
    "activity": ["IssueActivityListAPIEndpoint", "IssueActivityDetailAPIEndpoint"],
    "attachment": ["IssueAttachmentListCreateAPIEndpoint", "IssueAttachmentDetailAPIEndpoint"],
    "relation": ["IssueRelationListCreateAPIEndpoint"],
    "search": ["IssueSearchEndpoint"],
}


def _package_dir() -> Path:
    return Path(ISSUE_VIEWS.__path__[0])


@pytest.mark.unit
class TestWorkItemViewsStructure:
    def test_package_exposes_every_endpoint(self):
        missing = [name for name in ENDPOINTS if not hasattr(ISSUE_VIEWS, name)]
        assert not missing, f"missing from strata.api.views.issue: {missing}"

    def test_api_views_reexports_the_same_classes(self):
        for name in ENDPOINTS:
            assert getattr(API_VIEWS, name) is getattr(ISSUE_VIEWS, name), name

    def test_permission_helpers_remain_importable(self):
        missing = [name for name in PERMISSION_HELPERS if not hasattr(ISSUE_VIEWS, name)]
        assert not missing, f"missing permission helpers: {missing}"

    def test_legacy_import_paths_still_work(self):
        # These are the exact import statements used across the codebase.
        from strata.api.views.cycle import guest_cannot_view_issue as cycle_guest_helper
        from strata.api.views.intake import is_restricted_guest
        from strata.api.views.issue import IssueLinkDetailAPIEndpoint
        from strata.api.views.module import guest_cannot_view_issue as module_guest_helper

        assert cycle_guest_helper is not None
        assert module_guest_helper is not None
        assert is_restricted_guest is not None
        assert IssueLinkDetailAPIEndpoint is not None

    def test_each_endpoint_lives_in_its_documented_module(self):
        for module_name, names in MODULE_OWNERSHIP.items():
            module = importlib.import_module(f"strata.api.views.issue.{module_name}")
            for name in names:
                assert getattr(module, name, None) is getattr(ISSUE_VIEWS, name), f"{name} not in {module_name}"

    def test_every_endpoint_is_wired_to_a_url(self):
        from django.urls import URLPattern, URLResolver, get_resolver

        wired = set()

        def walk(patterns):
            for entry in patterns:
                if isinstance(entry, URLResolver):
                    walk(entry.url_patterns)
                elif isinstance(entry, URLPattern):
                    target = getattr(entry.callback, "view_class", None) or getattr(entry.callback, "cls", None)
                    if target is not None:
                        wired.add(target.__name__)

        walk(get_resolver().url_patterns)
        unwired = [name for name in ENDPOINTS if name not in wired]
        assert not unwired, f"endpoints not reachable from any URL: {unwired}"

    def test_no_submodule_has_undefined_names(self):
        """A missing import in a split module must fail here, not at runtime."""
        import builtins

        builtin_names = set(dir(builtins))
        problems = []
        for module_info in pkgutil.iter_modules(ISSUE_VIEWS.__path__):
            if not module_info.name.endswith(".py"):
                continue
            path = _package_dir() / module_info.name
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

            bound = set(builtin_names)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        bound.add(alias.asname or alias.name.split(".")[0])
                elif isinstance(node, ast.ImportFrom):
                    for alias in node.names:
                        bound.add(alias.asname or alias.name)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    bound.add(node.name)
                elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                    bound.add(node.id)
                elif isinstance(node, ast.arg):
                    bound.add(node.arg)

            used = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
            undefined = sorted(used - bound)
            if undefined:
                problems.append(f"{module_info.name}: {undefined}")

        assert not problems, "undefined names: " + "; ".join(problems)

    def test_shared_side_effect_symbols_live_in_common(self):
        """Shared symbols must be referenced through ``common`` so that a
        single mock.patch target covers every submodule that uses them."""
        common = importlib.import_module("strata.api.views.issue.common")
        for symbol in ("issue_activity", "model_activity", "base_host"):
            assert hasattr(common, symbol), f"{symbol} missing from common"

        # Every module that uses these symbols must reference them via
        # ``common.<symbol>`` rather than holding its own binding.
        for module_name in ("work_item", "link", "comment", "attachment", "relation"):
            source = (_package_dir() / f"{module_name}.py").read_text(encoding="utf-8")
            for symbol in ("issue_activity", "model_activity", "base_host"):
                if f"common.{symbol}" not in source:
                    continue
                # the symbol must not be bound locally as well
                assert f"import {symbol}\n" not in source, f"{module_name} still binds {symbol} locally"
