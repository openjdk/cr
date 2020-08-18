/*
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
 * or visit www.oracle.com if you need additional information or have any
 * questions.
 */

"use strict";

let state = {
	"metadata": null,
	"comparison": null,
	"commits": null,
	"head": {
		"content": null
	},
	"base": {
		"content": null
	},
	"view": null,
	"index": -1,
	"hunk": 0,
	"intervalId": -1,
	"hunks": null,
	"cache": {
		"cdiffs": null,
		"udiffs": null,
		"sdiffs": null,
		"frames": null,
		"old": null,
		"new": null,
		"patch": null
	}
};

function render(state) {
	log("render: view: " + state.view);
	body().innerHTML = "";
	body().removeEventListener("keydown", framesOnKeyDown);
	body().style.margin = 0;
	if (state.view !== "index") {
		if (state.head.content[state.index] === null) {
			fetchFileAtHead(state);
		}
		if (state.base.content[state.index] === null) {
			fetchFileAtBase(state);
		}
	}
	if (state.view === "index") {
		renderIndex(state);
	} else if (state.view === "udiff") {
		renderUdiff(state);
	} else if (state.view === "new") {
		renderNew(state);
	} else if (state.view === "old") {
		renderOld(state);
	} else if (state.view === "frames") {
		renderFrames(state);
	} else if (state.view === "cdiff") {
		renderCdiff(state);
	} else if (state.view === "sdiff") {
		renderSdiff(state);
	} else if (state.view === "patch") {
		renderPatch(state);
	} else {
		log("error: unexpected view: " + state.view);
	}
}

function summarize(files) {
	const res = {
		"changes": 0,
		"additions": 0,
		"deletions": 0
	}
	for (let file of files) {
		res.changes += file.changes;
		res.additions += file.additions;
		res.deletions += file.deletions;
	}

	return res;
}

function getCommitsPerFile(commits) {
	const res = {};
	for (let commit of commits) {
		for (let file of commit.files) {
			if (!(file.filename in res)) {
				res[file.filename] = new Array();
			}
			console.log(commit.sha);
			res[file.filename].unshift(commit);
		}
	}
	return res;
}

async function renderIndex(state) {
	body().style.margin = "8px";

	const metadata = state.metadata;

	const summary = create("div");
	summary.className = "summary";

	const header = create("h2");
	header.className = "summary";
	header.innerHTML = "Code Review for " + metadata.base.repo.full_name;

	const table = create("table");
	table.className = "summary";

	const generatedOnRow = create("tr");
	const generatedOnHeader = create("th");
	generatedOnHeader.innerHTML = "Generated on:";
	const generatedOnData = create("td");
	const date = new Date(metadata.created_at);
	generatedOnData.append(date.toUTCString());
	generatedOnRow.append(generatedOnHeader);
	generatedOnRow.append(generatedOnData);

	const compareAgainstRepoRow = create("tr");
	const compareAgainstRepoHeader = create("th");
	compareAgainstRepoHeader.innerHTML = "Compare against:";
	const compareAgainstRepoLink = create("a");
	compareAgainstRepoLink.href = metadata.base.repo.html_url;
	compareAgainstRepoLink.innerHTML = metadata.base.repo.html_url;
	const compareAgainstRepoData = create("td");
	compareAgainstRepoData.append(compareAgainstRepoLink);
	compareAgainstRepoRow.append(compareAgainstRepoHeader);
	compareAgainstRepoRow.append(compareAgainstRepoData);

	const compareAgainstRevRow = create("tr");
	const compareAgainstRevHeader = create("th");
	compareAgainstRevHeader.innerHTML = "Compare against version:";
	const compareAgainstRevData = create("td");
	const compareAgainstRevLink = create("a");
	compareAgainstRevLink.href = metadata.base.repo.html_url + "/commit/" + metadata.base.sha;
	compareAgainstRevLink.innerHTML = metadata.base.sha.substring(0, 8);
	compareAgainstRevData.append(compareAgainstRevLink);
	compareAgainstRevRow.append(compareAgainstRevHeader);
	compareAgainstRevRow.append(compareAgainstRevData);

	const summaryOfChangesRow = create("tr");
	const summaryOfChangesHeader = create("th");
	summaryOfChangesHeader.innerHTML = "Summary of changes:";
	const summaryOfChangesData = create("td");
	const { changes, additions, deletions } = summarize(state.comparison.files);
	summaryOfChangesData.innerHTML = changes + " lines changed; " + additions + " ins; " + deletions + " del"
	summaryOfChangesRow.append(summaryOfChangesHeader);
	summaryOfChangesRow.append(summaryOfChangesData);

	const patchOfChangesRow = create("tr");
	const patchOfChangesHeader = create("th");
	patchOfChangesHeader.innerHTML = "Diff of changes:";
	const patchOfChangesData = create("td");
	const patchOfChangesLink = create("a");
	patchOfChangesLink.href = "https://github.com/" + metadata.base.repo.full_name + "/compare/" + metadata.base.sha + "..." + metadata.head.sha + ".diff";
	patchOfChangesLink.innerHTML = metadata.base.sha.substring(0, 8) + "..." + metadata.head.sha.substring(0, 8) + ".diff";
	patchOfChangesData.append(patchOfChangesLink);
	patchOfChangesRow.append(patchOfChangesHeader);
	patchOfChangesRow.append(patchOfChangesData);

	const pullRequestRow = create("tr");
	const pullRequestHeader = create("th");
	pullRequestHeader.innerHTML = "Pull request:";
	const pullRequestData = create("td");
	const pullRequestLink = create("a");
	pullRequestLink.href = "https://github.com/" + metadata.base.repo.full_name + "/pull/" + metadata.number;
	pullRequestLink.innerHTML = metadata.number;
	pullRequestData.append(pullRequestLink);
	pullRequestRow.append(pullRequestHeader);
	pullRequestRow.append(pullRequestData);

	const legendRow = create("tr");
	const legendRowHeader = create("th");
	legendRowHeader.innerHTML = "Legend:";
	const legendRowData = create("td");
	const modifiedSpan = create("span");
	modifiedSpan.className = "file-modified";
	modifiedSpan.innerHTML = "Modified file";
	const removedSpan = create("span");
	removedSpan.className = "file-removed";
	removedSpan.innerHTML = "Deleted file";
	const newSpan = create("span");
	newSpan.className = "file-added";
	newSpan.innerHTML = "New file";
	legendRowData.append(modifiedSpan);
	legendRowData.append(create("br"));
	legendRowData.append(removedSpan);
	legendRowData.append(create("br"));
	legendRowData.append(newSpan);
	legendRow.append(legendRowHeader);
	legendRow.append(legendRowData);

	table.append(generatedOnRow);
	table.append(compareAgainstRepoRow);
	table.append(compareAgainstRevRow);
	table.append(summaryOfChangesRow);
	table.append(patchOfChangesRow);
	table.append(pullRequestRow);
	table.append(legendRow);

	summary.append(header);
	summary.append(table);

	body().append(summary);

	const commitsPerFile = getCommitsPerFile(await state.commits);
	const files = state.comparison.files;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const p = create("p");
		const code = create("code");
		if (file.status === "modified" || file.status === "copied" || file.status === "renamed") {
			const cdiff = create("a");
			cdiff.href = "#cdiff-" + i;
			cdiff.innerHTML = "Cdiffs";
			code.append(cdiff, " ");

			const udiff = create("a");
			udiff.href = "#udiff-" + i;
			udiff.innerHTML = "Udiffs";
			code.append(udiff, " ");

			const sdiff = create("a");
			sdiff.href = "#sdiff-" + i;
			sdiff.innerHTML = "Sdiffs";
			code.append(sdiff, " ");

			const frames = create("a");
			frames.href = "#frames-" + i;
			frames.innerHTML = "Frames";
			code.append(frames, " ");

			const oldFile = create("a");
			oldFile.href = "#old-" + i;
			oldFile.innerHTML = "Old";
			code.append(oldFile, " ");

			const newFile = create("a");
			newFile.href = "#new-" + i;
			newFile.innerHTML = "New";
			code.append(newFile, " ");

			const patchFile = create("a");
			patchFile.href = "#patch-" + i;
			patchFile.innerHTML = "Patch";
			code.append(patchFile, " ");

			const rawFile = create("a");
			rawFile.href = "https://raw.githubusercontent.com/" + metadata.head.repo.full_name + "/" + metadata.head.sha + "/" + file.filename;
			rawFile.innerHTML = "Raw";
			code.append(rawFile, " ");

			p.append(code);

			const fileNameSpan = create("span"); 
			fileNameSpan.className = "file-modified";
			fileNameSpan.innerHTML = file.filename;
			p.append(fileNameSpan);

			if (file.status === "copied" || file.status === "renamed") {
				const italic = create("i");
				italic.innerHTML = "(was " + file.previous_filename + ")";
				p.append(italic);
			}
		} else if (file.status === "added") {
			code.append("------ ");
			code.append("------ ");
			code.append("------ ");
			code.append("------ ");
			code.append("--- ");

			const newFile = create("a");
			newFile.href = "#new-" + i;
			newFile.innerHTML = "New";
			code.append(newFile, " ");

			const patchFile = create("a");
			patchFile.href = "#patch-" + i;
			patchFile.innerHTML = "Patch";
			code.append(patchFile, " ");

			const rawFile = create("a");
			rawFile.href = "https://raw.githubusercontent.com/" + metadata.head.repo.full_name + "/" + metadata.head.sha + "/" + file.filename;
			rawFile.innerHTML = "Raw";
			code.append(rawFile, " ");

			p.append(code);

			const fileNameSpan = create("span"); 
			fileNameSpan.className = "file-added";
			fileNameSpan.innerHTML = file.filename;

			p.append(fileNameSpan);
		} else if (file.status === "deleted") {
			code.append("------ ");
			code.append("------ ");
			code.append("------ ");
			code.append("------ ");

			const oldFile = create("a");
			oldFile.href = "#old-" + i;
			oldFile.innerHTML = "Old";
			code.append(oldFile, " ");

			code.append("--- ");

			const patchFile = create("a");
			patchFile.href = "#patch-" + i;
			patchFile.innerHTML = "Patch";
			code.append(patchFile, " ");

			const rawFile = create("a");
			rawFile.href = "https://raw.githubusercontent.com/" + metadata.head.repo.full_name + "/" + metadata.head.sha + "/" + file.filename;
			rawFile.innerHTML = "Raw";
			code.append(rawFile, " ");

			p.append(code);

			const fileNameSpan = create("span"); 
			fileNameSpan.className = "file-removed";
			fileNameSpan.innerHTML = file.filename;

			p.append(fileNameSpan);
		}

		body().append(p);

		const blockquote = create("blockquote");
		const commitMessages = create("pre");
		for (var commit of commitsPerFile[file.filename]) {
			const subject = commit.commit.message.split('\n')[0];
			commitMessages.append(commit.sha.substring(0, 8) + ": " + subject, "\n");
		}
		const blockquoteSpan = create("span");
		blockquoteSpan.className = "stat";
		blockquoteSpan.innerHTML = file.changes + " lines changed; " + file.additions + " ins; " + file.deletions + " del";
		blockquote.append(commitMessages, blockquoteSpan);
		body().append(blockquote);
	}

	const hr = create("hr");
	const footer = create("p");
	footer.className = "version";

	const webrevLink = create("a");
	webrevLink.href = "https://git.openjdk.java.net/cr/blob/master/webrev.js";
	webrevLink.innerHTML = "webrev.js";
	footer.append("This code review page was prepared using ", webrevLink, ".");

	body().append(hr);
	body().append(footer);
}

function hasOnlyAdditions(hunk, context) {
	for (var line of hunk.src.lines) {
		if (line.startsWith("-")) {
			return false;
		}
	}
	return true;
}

function hasOnlyDeletions(hunk, context) {
	for (var line of hunk.dst.lines) {
		if (line.startsWith("+")) {
			return false;
		}
	}
	return true;
}

function createNavigation(view, index) {
	const files = state.comparison.files;
	const center = create("center");
	let prevModified = -1;
	for (let i = index - 1; i >= 0; i--) {
		const s = files[i].status;
		if (s === "modified" || s === "renamed" || s === "copied") {
			prevModified = i;
			break;
		}
	}
	if (prevModified === -1) {
		const prev = create("span");
		prev.innerHTML = "&lt; prev";
		center.append(prev);
	} else {
		const prev = create("a");
		prev.innerHTML = "&lt; prev";
		prev.href = "#" + view + "-" + prevModified;
		center.append(prev);
	}

	const indexLink = create("a");
	indexLink.href = "#";
	indexLink.innerHTML = "index";
	indexLink.addEventListener("click", function (e) {
		e.preventDefault();
		state.view = "index";
		window.history.pushState({}, null, window.location.search);
		render(state);
	});
	center.append(" ", indexLink, " ");

	let nextModified = -1;
	for (let i = index + 1; i < files.length; i++) {
		const s = files[i].status;
		if (s === "modified" || s === "copied" || s === "renamed") {
			nextModified = i;
			break;
		}
	}
	if (nextModified === -1) {
		const next = create("span");
		next.innerHTML = "next &gt;";
		center.append(next);
	} else {
		const next = create("a");
		next.href = "#" + view + "-" + nextModified;
		next.innerHTML = "next &gt;";
		center.append(next);
	}

	return center;
}

function body() {
	return document.getElementsByTagName("body")[0];
}

function create(name) {
	return document.createElement(name);
}

function log(s) {
	console.log(s);
}

function get(id) {
	return document.getElementById(id);
}

function framesScrollToPrevHunk() {
	state.hunk = state.hunk - 1;
	if (state.hunk < 0) {
		state.hunk = 0;
	}
	const display = state.hunk === 0 ? "BOF" : String(state.hunk);
	get("display").value = display;

	const lhs = get("lhs");
	const lhsHunkSpan = get("lhs-hunk-" + state.hunk);
	lhs.scrollTop = lhsHunkSpan.offsetTop - 30;

	const rhsHunkSpan = get("rhs-hunk-" + state.hunk);
	const rhs = get("rhs");
	rhs.scrollTop = rhsHunkSpan.offsetTop - 30;
}

function framesScrollToNextHunk() {
	state.hunk = state.hunk + 1;
	if (state.hunk > state.hunks.length + 1) {
		state.hunk = state.hunks.length + 1;
	}

	const display = state.hunk === (state.hunks.length + 1) ? "EOF" : String(state.hunk);
	get("display").value = display;

	const lhs = get("lhs");
	const lhsHunkSpan = get("lhs-hunk-" + state.hunk);
	lhs.scrollTop = lhsHunkSpan.offsetTop - 30;

	const rhsHunkSpan = get("rhs-hunk-" + state.hunk);
	const rhs = get("rhs");
	rhs.scrollTop = rhsHunkSpan.offsetTop - 30;
}

function framesOnKeyDown(e) {
	if (e.key === 'j') {
		framesScrollToNextHunk();
	} else if (e.key === 'k') {
		framesScrollToPrevHunk();
	}
}

function hunks(state) {
	const files = state.comparison.files;
	if (state.hunks === null) {
		state.hunks = new Array(files.length);
		state.hunks.fill(null);
	}
	if (state.hunks[state.index] === null) {
		state.hunks[state.index] = removeContext(files[state.index].patch);
	}
	return state.hunks[state.index];
}

function filename(state) {
	const files = state.comparison.files;
	return files[state.index].filename;
}

async function renderPatch(state) {
	body().style.margin = "8px";
	const index = state.index;

	if (state.cache.patch[index] !== null) {
		body().append(state.cache.patch[index]);
		return;
	}

	const main = create("div");
	let _hunks = null;
	let context = 0;
	if (state.comparison.files[index].status === "modified") {
		const baseContent = await state.base.content[index];
		const headContent = await state.head.content[index];
		context = 3;
		_hunks = addContext(hunks(state), context, baseContent, headContent);
	} else {
		_hunks = hunks(state);
	}

	const pre = create("pre");
	pre.append("--- ", "a/", filename(state), "\n");
	pre.append("+++ ", "b/", filename(state), "\n");
	for (let hunk of _hunks) {
		pre.append("@@ -", String(hunk.src.start), ",", String(hunk.src.lines.length),
		             " +", String(hunk.dst.start), ",", String(hunk.dst.lines.length), " @@\n");
		let srcIndex = 0;
		let dstIndex = 0;

		// Context before
		while ((srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith(" ")) &&
		       (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith(" "))) {
			pre.append(hunk.src.lines[srcIndex], "\n");
			srcIndex++;
			dstIndex++;
		}
		while (srcIndex < hunk.src.lines.length || dstIndex < hunk.dst.lines.length) {
			while (srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith("-")) {
				pre.append(hunk.src.lines[srcIndex], "\n");
				srcIndex++;
			}
			while (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith("+")) {
				pre.append(hunk.dst.lines[dstIndex], "\n");
				dstIndex++;
			}
			while ((srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith(" ")) &&
			       (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith(" "))) {
				pre.append(hunk.src.lines[srcIndex], "\n");
				srcIndex++;
				dstIndex++;
			}
		}
	}
	main.append(pre);
	state.cache.patch[index] = main;
	body().append(main);
}

async function renderFrames(state) {
	// reset state
	state.hunk = 0;
	state.intervalId = -1;

	const index = state.index;
	if (state.cache.frames[index] !== null) {
		body().append(state.cache.frames[index]);
		return;
	}

	const oldLines = await state.base.content[state.index];
	const newLines = await state.head.content[state.index];
	const _hunks = hunks(state);

	const container = create("div");
	container.className = "frames-container";
	body().addEventListener("keydown", framesOnKeyDown);

	const content = create("div");
	content.className = "frames-content";

	const left = create("div");
	left.id = "lhs";
	left.className = "frames-pane";
	left.style.borderRight = "5px ridge buttonface";
	const leftContent = create("pre");

	const leftLineNumberColWidth = String(oldLines.length).length;
	let leftIndex = 0;
	for (let i = 0; i < _hunks.length; i++) {
		const hunk = _hunks[i];
		const onlyDeletions = hasOnlyDeletions(hunk, 0);
		const start = hunk.src.start - 1;
		for (let j = leftIndex; j < start; j++, leftIndex++) {
			const lineno = String(leftIndex + 1);
			const line = oldLines[leftIndex];
			const padding = leftLineNumberColWidth - lineno.length;
			leftContent.append(" ".repeat(padding), lineno, " ", line, "\n");
		}
		for (let j = 0; j < hunk.src.lines.length; j++, leftIndex++) {
			const lineno = String(leftIndex + 1);
			const line = oldLines[leftIndex];
			const padding = leftLineNumberColWidth - lineno.length;
			const span = create("span");
			span.className = onlyDeletions ? "line-removed" : "line-modified";
			if (j == 0) {
				span.id = "lhs-hunk-" + String(i + 1);
			}
			span.append(" ".repeat(padding), lineno, " ", line, "\n");
			leftContent.append(span);
		}
		const diffInLines = hunk.dst.lines.length - hunk.src.lines.length;
		for (let j = 0; j < diffInLines; j++) {
			if (hunk.src.lines.length === 0 && j === 0) {
				const span = create("span");
				if (j == 0) {
					span.id = "lhs-hunk-" + String(i + 1);
				}
				leftContent.append(span);
			}
			leftContent.append("\n");
		}
	}
	const lastHunk = _hunks[_hunks.length - 1];
	for (let i = lastHunk.src.start + lastHunk.src.lines.length - 1; i < oldLines.length; i++) {
		const line = oldLines[i];
		const lineno = String(i + 1);
		const padding = leftLineNumberColWidth - lineno.length;
		leftContent.append(" ".repeat(padding), lineno, " ", line, "\n");
	}
	const lhsEOF = create("span");
	lhsEOF.id = "lhs-hunk-" + String(_hunks.length + 1);
	const lhsEOFText = create("b");
	lhsEOFText.style.fontSize = "large";
	lhsEOFText.style.color = "red";
	lhsEOFText.innerHTML = "--- EOF ---"
	lhsEOF.append(lhsEOFText);
	leftContent.append(lhsEOF);
	for (let i = 0; i < 80; i++) {
		leftContent.append("\n");
	}

	const lhsBOF = create("span");
	lhsBOF.id = "lhs-hunk-0";

	left.append(create("hr"), lhsBOF, leftContent);

	const right = create("div");
	right.id = "rhs";
	right.className = "frames-pane";
	right.style.flexGrow = 1;
	const rightContent = create("pre");

	const rightLineNumberColWidth = String(newLines.length).length;
	let rightIndex = 0;
	for (let i = 0; i < _hunks.length; i++) {
		const hunk = _hunks[i];
		const onlyAdditions = hasOnlyAdditions(hunk, 0);
		const start = hunk.dst.start - 1;
		for (let j = rightIndex; j < start; j++, rightIndex++) {
			const lineno = String(rightIndex + 1);
			const line = newLines[rightIndex];
			const padding = rightLineNumberColWidth - lineno.length;
			rightContent.append(" ".repeat(padding), lineno, " ", line, "\n");
		}
		for (let j = 0; j < hunk.dst.lines.length; j++, rightIndex++) {
			const lineno = String(rightIndex + 1);
			const line = newLines[rightIndex];
			const padding = rightLineNumberColWidth - lineno.length;
			const span = create("span");
			if (j == 0) {
				span.id = "rhs-hunk-" + String(i + 1);
			}
			span.className = onlyAdditions ? "line-added" : "line-modified";
			span.append(" ".repeat(padding), lineno, " ", line, "\n");
			rightContent.append(span);
		}
		const diffInLines = hunk.src.lines.length - hunk.dst.lines.length;
		for (let j = 0; j < diffInLines; j++) {
			if (hunk.dst.lines.length === 0 && j === 0) {
				const span = create("span");
				if (j == 0) {
					span.id = "rhs-hunk-" + String(i + 1);
				}
				rightContent.append(span);
			}
			rightContent.append("\n");
		}
	}
	for (let i = lastHunk.dst.start + lastHunk.dst.lines.length - 1; i < newLines.length; i++) {
		const line = newLines[i];
		const lineno = String(i + 1);
		const padding = rightLineNumberColWidth - lineno.length;
		rightContent.append(" ".repeat(padding), lineno, " ", line, "\n");
	}
	const rhsEOF = create("span");
	rhsEOF.id = "rhs-hunk-" + String(_hunks.length + 1);
	const rhsEOFText = create("b");
	rhsEOFText.style.fontSize = "large";
	rhsEOFText.style.color = "red";
	rhsEOFText.innerHTML = "--- EOF ---"
	rhsEOF.append(rhsEOFText);
	rightContent.append(rhsEOF);
	for (let i = 0; i < 80; i++) {
		rightContent.append("\n");
	}
	const rhsBOF = create("span");
	rhsBOF.id = "rhs-hunk-0";
	right.append(create("hr"), rhsBOF, rightContent);

	const controls = create("div");
	controls.className = "frames-controls";
	const table = create("table");
	table.className = "navigation";
	const row = create("tr");
	const c1 = create("td");
	c1.valign = "middle";
	c1.width = "25%";
	c1.innerHTML = "Diff navigation:\nUse 'j' and 'k' for next and previous diffs; or use buttons at right";

	const c2 = create("td");
	c2.align = "center";
	c2.valign = "top";
	c2.width = "50%";
	const center = create("div");
	const buttons = create("table");
	buttons.border = 0;
	buttons.align = "center";
	const buttonsRow1 = create("tr"); 

	const startButton = create("td");
	startButton.className = "button";
	const startButtonLink = create("a");
	startButtonLink.title = "Go to Beginning of File";
	startButtonLink.innerHTML = "BOF";
	startButtonLink.style.textDecoration = "none";
	startButtonLink.addEventListener("click", function () {
		const lhsBOFSpan = get("lhs-hunk-0");
		const lhs = get("lhs");
		lhs.scrollTop = lhsBOFSpan.offsetTop;

		const rhsBOFSpan = get("rhs-hunk-0");
		const rhs = get("rhs");
		rhs.scrollTop = rhsBOFSpan.offsetTop;

		state.hunk = 0;
		get("display").value = "BOF";
	});
	startButton.append(startButtonLink);

	const scrollUpButton = create("td");
	scrollUpButton.className = "button";
	const scrollUpLink = create("a");
	scrollUpLink.title = "Scroll up; Press and Hold to accelerate";
	scrollUpLink.href = "#index";
	scrollUpLink.innerHTML = "Scroll Up";
	scrollUpLink.style.textDecoration = "none";
	scrollUpLink.addEventListener("mousedown", function() {
		let acceleration = 3.0;
		let n = 0;
		state.intervalId = window.setInterval(function() {
			if ((n % 10) === 0) {
				acceleration *= 1.2;
			}
			get("lhs").scrollTop -= acceleration;
			get("rhs").scrollTop -= acceleration;
			n++;
		}, 10);
	});
	scrollUpLink.addEventListener("mouseup", function() {
		window.clearInterval(state.intervalId);
	});
	scrollUpLink.addEventListener("click", function(e) {
		e.preventDefault();
	});
	scrollUpButton.append(scrollUpLink);

	const prevHunkButton = create("td");
	prevHunkButton.className = "button";
	const prevHunkLink = create("a");
	prevHunkLink.title = "Go to previous Diff";
	prevHunkLink.innerHTML = "Prev Diff";
	prevHunkLink.style.textDecoration = "none";
	prevHunkLink.addEventListener("click", framesScrollToPrevHunk);
	prevHunkButton.append(prevHunkLink);

	buttonsRow1.append(startButton, scrollUpButton, prevHunkButton);

	const buttonsRow2 = create("tr"); 

	const endButton = create("td");
	endButton.className = "button";
	const endButtonLink = create("a");
	endButtonLink.title = "Go to End of File";
	endButtonLink.innerHTML = "EOF";
	endButtonLink.style.textDecoration = "none";
	endButtonLink.addEventListener("click", function () {
		const lhsEOFSpan = get("lhs-hunk-" + String(_hunks.length + 1));
		const lhs = get("lhs");
		lhs.scrollTop = lhsEOFSpan.offsetTop - 30;

		const rhsEOFSpan = get("rhs-hunk-" + String(_hunks.length + 1));
		const rhs = get("rhs");
		rhs.scrollTop = rhsEOFSpan.offsetTop - 30;

		state.hunk = _hunks.length + 1;

		get("display").value = "EOF";
	});
	endButton.append(endButtonLink);

	const scrollDownButton = create("td");
	scrollDownButton.className = "button";
	const scrollDownLink = create("a");
	scrollDownLink.title = "Scroll down; Press and Hold to accelerate";
	scrollDownLink.innerHTML = "Scroll Down";
	scrollDownLink.style.textDecoration = "none";
	scrollDownLink.addEventListener("mousedown", function() {
		let acceleration = 3.0;
		let n = 0;
		state.intervalId = window.setInterval(function() {
			if ((n % 10) === 0) {
				acceleration *= 1.2;
			}
			get("lhs").scrollTop += acceleration;
			get("rhs").scrollTop += acceleration;
			n++;
		}, 10);
	});
	scrollDownLink.addEventListener("mouseup", function() {
		window.clearInterval(state.intervalId);
	});
	scrollDownLink.addEventListener("click", function(e) {
		e.preventDefault();
	});
	scrollDownButton.append(scrollDownLink);

	const nextHunkButton = create("td");
	nextHunkButton.className = "button";
	const nextHunkLink = create("a");
	nextHunkLink.title = "Go to next Diff";
	nextHunkLink.innerHTML = "Next Diff";
	nextHunkLink.style.textDecoration = "none";
	nextHunkLink.addEventListener("click", framesScrollToNextHunk);
	nextHunkButton.append(nextHunkLink);

	buttonsRow2.append(endButton, scrollDownButton, nextHunkButton);

	buttons.append(buttonsRow1);
	buttons.append(buttonsRow2);
	center.append(buttons);
	c2.append(center);

	const c3 = create("td");
	c3.width = "25%";
	c3.valign = "middle";
	c3.style.paddingLeft = "185px";
	const form = create("form");
	const input = create("input");
	input.id = "display";
	input.value = "BOF";
	input.size = 8;
	input.type = "text";
	form.append(input);
	c3.append(form);

	row.append(c1, c2, c3);
	table.append(row);
	controls.append(table);

	const navigation = create("div");
	navigation.className = "frames-navigation";
	navigation.append(createNavigation("frames", index));

	content.append(left, right);
	container.append(content, controls, navigation);

	state.cache.frames[index] = container;
	body().append(container);
}

function addLineNumbers(lines) {
	const digits = String(lines.length).length;
	const res = new Array(lines.length);
	for (let i = 0; i < lines.length; i++) {
		const lineno = String(i + 1);
		const padding = digits - lineno.length;
		res[i] = " ".repeat(padding) + lineno + " " + lines[i];
	}
	return res;
}

async function renderNew(state) {
	body().style.margin = "8px";
	const index = state.index;
	if (state.cache["new"][index] !== null) {
		body().append(state.cache["new"][index]);
		return;
	}
	const lines = await state.head.content[index];
	const pre = create("pre");
	pre.innerHTML = addLineNumbers(lines).join('\n');
	state.cache["new"][index] = pre;
	body().append(pre);
}

async function renderOld(state) {
	body().style.margin = "8px";
	const index = state.index;
	if (state.cache.old[index] !== null) {
		body().append(state.cache.old[index]);
		return;
	}
	const lines = await state.base.content[index];
	const pre = create("pre");
	pre.innerHTML = addLineNumbers(lines).join('\n');
	state.cache.old[index] = pre;
	body().append(pre);
}

function createPrintThisPage() {
	const link = create("a");
	link.href = "javascript:print()";
	link.className = "print";
	link.innerHTML = "Print this page";
	return link;
}

async function renderUdiff(state) {
	body().style.margin = "8px";
	const index = state.index;
	if (state.cache.udiffs[index] !== null) {
		body().append(state.cache.udiffs[index]);
		return;
	}

	const main = create("div");
	main.append(createNavigation("udiff", index));
	main.append(createFilenameHeader(state));
	main.append(createPrintThisPage());
	main.append(create("hr"));

	const baseContent = await state.base.content[index];
	const headContent = await state.head.content[index];
	const context = 5;
	const hunksWithContext = addContext(hunks(state), context, baseContent, headContent);
	const udiff = create("pre");
	for (let hunk of hunksWithContext) {
		const span = create("span");
		const header = "@@ -" + hunk.src.start + "," + hunk.src.lines.length +
			     " +" + hunk.dst.start + "," + hunk.dst.lines.length +
			     " @@";
		span.append(header, "\n");
		span.className = "line-new-header";
		udiff.append(span);

		const onlyDeletions = hasOnlyDeletions(hunk, context);
		const onlyAdditions = hasOnlyAdditions(hunk, context);

		let srcIndex = 0;
		let dstIndex = 0;

		// Context before
		while (hunk.src.lines[srcIndex].startsWith(" ") && hunk.dst.lines[dstIndex].startsWith(" ")) {
			const span = create("span");
			span.append(hunk.src.lines[srcIndex], "\n");
			udiff.append(span);
			srcIndex++;
			dstIndex++;
		}

		while (srcIndex < hunk.src.lines.length && dstIndex < hunk.dst.lines.length) {
			while (srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith("-")) {
				const span = create("span");
				span.append(hunk.src.lines[srcIndex], "\n");
				span.className = onlyDeletions ? "udiff-line-removed" : "udiff-line-modified-removed";
				udiff.append(span);
				srcIndex++;
			}
			while (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith("+")) {
				const span = create("span");
				span.append(hunk.dst.lines[dstIndex], "\n");
				span.className = onlyAdditions ? "udiff-line-added" : "udiff-line-modified-added";
				udiff.append(span);
				dstIndex++;
			}
			while ((srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith(" ")) &&
			       (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith(" "))) {
				const span = create("span");
				span.append(hunk.src.lines[srcIndex], "\n");
				udiff.append(span);
				srcIndex++;
				dstIndex++;
			}
		}
	}
	main.append(udiff);
	main.append(createNavigation("udiff", index));
	state.cache.udiffs[index] = main;
	body().append(main);
}

function createFilenameHeader(state) {
	const h2 = create("h2");
	h2.innerHTML = filename(state);
	return h2;
}

async function renderCdiff(state) {
	body().style.margin = "8px";
	const index = state.index;
	if (state.cache.cdiffs[index] !== null) {
		body().append(state.cache.udiffs[index]);
		return;
	}

	const main = create("div");
	main.append(createNavigation("cdiff", index));
	main.append(createFilenameHeader(state));
	main.append(createPrintThisPage());
	main.append(create("hr"));

	const baseContent = await state.base.content[state.index];
	const headContent = await state.head.content[state.index];
	const context = 5;
	const hunksWithContext = addContext(hunks(state), context, baseContent, headContent);

	const cdiff = create("pre");
	for (let hunk of hunksWithContext) {
		const srcHeaderSpan = create("span");
		const srcHeader = "*** " + hunk.src.start + "," + hunk.src.lines.length + " ***";
		srcHeaderSpan.append(srcHeader, "\n");
		srcHeaderSpan.className = "line-old-header";
		cdiff.append(srcHeaderSpan);

		const onlyDeletions = hasOnlyDeletions(hunk, context);
		const onlyAdditions = hasOnlyAdditions(hunk, context);

		for (var line of hunk.src.lines) {
			const span = create("span");
			if (line.startsWith("-")) {
				span.className = onlyDeletions ? "line-removed" : "line-modified";
				line = "!" + line.substring(1);
			}
			span.append(line, "\n");
			cdiff.append(span);
		}

		const dstHeaderSpan = create("span");
		const dstHeader = "*** " + hunk.dst.start + "," + hunk.dst.lines.length + " ***";
		dstHeaderSpan.append(srcHeader, "\n");
		dstHeaderSpan.className = "line-new-header";
		cdiff.append(dstHeaderSpan);

		for (var line of hunk.dst.lines) {
			const span = create("span");
			if (line.startsWith("+")) {
				span.className = onlyAdditions ? "line-added" : "line-modified";
				line = "!" + line.substring(1);
			}
			span.append(line, "\n");
			cdiff.append(span);
		}

	}
	main.append(cdiff);
	main.append(createNavigation("cdiff", index));
	state.cache.cdiffs[index] = main;
	body().append(main);
}

async function renderSdiff(state) {
	body().style.margin = "8px";
	const index = state.index;
	if (state.cache.sdiffs[index] !== null) {
		body().append(state.cache.sdiffs[index]);
		return;
	}

	const main = create("div");
	main.append(createNavigation("sdiff", index));
	main.append(createFilenameHeader(state));
	main.append(createPrintThisPage());

	const baseContent = await state.base.content[index];
	const headContent = await state.head.content[index];
	const context = 20;
	const hunksWithContext = addContext(hunks(state), context, baseContent, headContent);

	const tbody = create("tbody");
	for (let hunk of hunksWithContext) {
		const row = create("tr");
		row.valign = "top";

		const lhs = create("td");
		lhs.style.verticalAlign = "top";
		lhs.append(create("hr"));
		const lhsContent = create("pre");

		const rhs = create("td");
		rhs.style.verticalAlign = "top";
		rhs.append(create("hr"));
		const rhsContent = create("pre");

		const onlyDeletions = hasOnlyDeletions(hunk, context);
		const onlyAdditions = hasOnlyAdditions(hunk, context);
		let srcIndex = 0;
		let dstIndex = 0;
		while (hunk.src.lines[srcIndex].startsWith(" ") && hunk.dst.lines[dstIndex].startsWith(" ")) {
			const line = hunk.src.lines[srcIndex];
			const lhsLineno = String(hunk.src.start + srcIndex);
			const rhsLineno = String(hunk.dst.start + dstIndex);
			lhsContent.append(lhsLineno, " ", line.substring(1), "\n");
			rhsContent.append(rhsLineno, " ", line.substring(1), "\n");
			srcIndex++;
			dstIndex++;
		}
		while (srcIndex < hunk.src.lines.length && dstIndex < hunk.dst.lines.length) {
			let addedSrcLines = 0;
			while (srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith("-")) {
				const line = hunk.src.lines[srcIndex];
				const span = create("span");
				span.className = onlyDeletions ? "line-removed" : "line-modified";
				const lineno = String(hunk.src.start + srcIndex);
				span.append(lineno, " ", line.substring(1), "\n");
				lhsContent.append(span);
				srcIndex++;
				addedSrcLines++;
			}
			let addedDstLines = 0;
			while (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith("+")) {
				const line = hunk.dst.lines[dstIndex];
				const span = create("span");
				span.className = onlyAdditions ? "line-added" : "line-modified";
				const lineno = String(hunk.dst.start + dstIndex);
				span.append(lineno, " ", line.substring(1), "\n");
				rhsContent.append(span);
				dstIndex++;
				addedDstLines++;
			}

			for (let j = 0; j < (addedDstLines - addedSrcLines); j++) {
				lhsContent.append("\n");
			}
			for (let j = 0; j < (addedSrcLines - addedDstLines); j++) {
				rhsContent.append("\n");
			}

			while ((srcIndex < hunk.src.lines.length && hunk.src.lines[srcIndex].startsWith(" ")) &&
			       (dstIndex < hunk.dst.lines.length && hunk.dst.lines[dstIndex].startsWith(" "))) {
				const line = hunk.src.lines[srcIndex];
				const span = create("span");
				const lhsLineno = String(hunk.src.start + srcIndex);
				const rhsLineno = String(hunk.dst.start + dstIndex);
				lhsContent.append(lhsLineno, " ", line.substring(1), "\n");
				rhsContent.append(rhsLineno, " ", line.substring(1), "\n");
				srcIndex++;
				dstIndex++;
			}
		}

		lhs.append(lhsContent);
		rhs.append(rhsContent);
		row.append(lhs, rhs);
		tbody.append(row);

	}
	const sdiff = create("table");
	sdiff.append(tbody);
	main.append(sdiff);
	main.append(createNavigation("sdiff", index));
	state.cache.sdiffs[index] = main;
	body().append(main);
}

function parseRange(s) {
	const parts = s.split(',');
	const start = parts[0].substring(1); // skip leading '-' or '+'
	const n = parts[1];
	return {
		start: start,
		n: n
	};
}

class Hunk {
	constructor(srcStart, srcLines, dstStart, dstLines) {
		this.source = {
			start: srcStart,
			lines: srcLines
		};
		this.destination = {
			start: dstStart,
			lines: dstLines
		};
	}

	get src() {
		return this.source;
	}

	get dst() {
		return this.destination;
	}
}

function addContext(hunks, n, baseContent, headContent) {
	const res = new Array();

	for (let i = 0; i < hunks.length; i++) {
		const hunk = hunks[i];
		let srcStart = hunk.src.start - n;
		if (srcStart < 1) {
			srcStart = 1;
		}
		const srcLines = new Array();
		let dstStart = hunk.dst.start - n;
		if (dstStart < 1) {
			dstStart = 1;
		}
		const dstLines = new Array();

		const contextEnd = Math.min(n, hunk.src.start - 1);

		// Context before
		for (let j = 0; j < contextEnd; j++) {
			srcLines.push(" " + baseContent[srcStart + j - 1]);
			dstLines.push(" " + headContent[dstStart + j - 1]);
		}

		// Changes
		for (let line of hunk.src.lines) {
			srcLines.push(line);
		}
		for (let line of hunk.dst.lines) {
			dstLines.push(line);
		}

		let srcEnd = hunk.src.start + hunk.src.lines.length;
		let dstEnd = hunk.dst.start + hunk.dst.lines.length;
		for (let j = i + 1; j < hunks.length && ((hunks[j].src.start <= srcEnd + n) || (hunks[j].dst.start <= dstEnd + n)); j++, i++) {
			const next = hunks[j];
			const numSrcContext = next.src.start - srcEnd;
			for (let k = 0; k < numSrcContext; k++) {
				srcLines.push(" " + baseContent[srcEnd + k - 1]);
			}
			const numDstContext = next.dst.start - dstEnd;
			for (let k = 0; k < numDstContext; k++) {
				dstLines.push(" " + headContent[dstEnd + k - 1]);
			}

			for (let line of next.src.lines) {
				srcLines.push(line);
			}
			for (let line of next.dst.lines) {
				dstLines.push(line);
			}
			srcEnd = next.src.start + next.src.lines.length;
			dstEnd = next.dst.start + next.dst.lines.length;
		}

		for (let j = 0; j < n && (srcEnd + j) <= baseContent.length; j++) {
			srcLines.push(" " + baseContent[srcEnd + j - 1]);
			dstLines.push(" " + headContent[dstEnd + j - 1]);
		}

		res.push(new Hunk(srcStart, srcLines, dstStart, dstLines));
	}

	return res;
}

function removeContext(patch) {
	const hunks = new Array();
	let srcStart = 0;
	let srcLines = new Array();
	let dstStart = 0;
	let dstLines = new Array();
	let isBefore = true;

	const lines = patch.split('\n');
	const end = patch.endsWith('\n') ? lines.length - 1 : lines.length;
	for (let i = 0; i < end; i++) {
		const line = lines[i];
		if (line.startsWith("@@")) {
			if (srcLines.length > 0 || dstLines.length > 0) {
				hunks.push(new Hunk(srcStart, srcLines, dstStart, dstLines));
			}

			const parts = line.split(' ');
			srcStart = Number(parseRange(parts[1]).start);
			dstStart = Number(parseRange(parts[2]).start);
			srcLines = new Array();
			dstLines = new Array();
		} else if (line.startsWith(' ') && !isBefore) {
			while (i < lines.length && lines[i].startsWith(' ')) {
				i++;
			}
			hunks.push(new Hunk(srcStart, srcLines, dstStart, dstLines));
			srcStart = srcStart + srcLines.length;
			srcLines = new Array();
			dstStart = dstStart + dstLines.length;
			dstLines = new Array();
		} else if (line.startsWith(' ') && isBefore) {
			srcStart++;
			dstStart++;
		} else if (line.startsWith('-')) {
			isBefore = false;
			srcLines.push(line);

		} else if (line.startsWith('+')) {
			isBefore = false;
			dstLines.push(line);
		} else if (line.startsWith("\\ No newline at end of file")) {
			continue;
	        } else {
			throw "Unexpected content on line " + i + ": '" + line + "'";
		}
	}

	// The last hunk did not have context after
	if (srcLines.length > 0 || dstLines.length > 0) {
		hunks.push(new Hunk(srcStart, srcLines, dstStart, dstLines));
	}

	return hunks;
}

function renderFromFragment(fragment) {
	if (fragment === "") {
		state.view = "index";
	} else {
		const fragmentParts = fragment.split("-");
		state.view = fragmentParts[0].substring(1);
		state.index = Number(fragmentParts[1]);
	}
	render(state);
}

async function fetchMetadata(repo, prId, range) {
	const raw = "https://raw.githubusercontent.com/openjdk/webrevs";
	const ref = "master";
	return fetch(raw + "/" + ref + "/" + repo + "/" + prId + "/" + range + "/metadata.json")
			.then(r => r.json())
			.then(o => {
				o.number = prId;
				return o;
			});
}

async function fetchComparison(repo, prId, range, metadata) {
	const raw = "https://raw.githubusercontent.com/openjdk/webrevs";
	const ref = "master";
	const api = "https://api.github.com/repos/" + metadata.base.repo.full_name + "/compare/" +
		    metadata.base.sha + "..." + metadata.head.sha;
	return fetch(raw + "/" + ref + "/" + repo + "/" + prId + "/" + range + "/comparison.json")
			.then(r => r.ok ? r : fetch(api))
			.then(r => r.json());
}

async function fetchCommits(repo, prId, range) {
	// TODO: implement API fallback
	const raw = "https://raw.githubusercontent.com/openjdk/webrevs";
	const ref = "master";
	return fetch(raw + "/" + ref + "/" + repo + "/" + prId + "/" + range + "/commits.json").then(r => r.json());
}

function fetchFileAtHead(state) {
	const index = state.index;
	const file = state.comparison.files[index];
	if (file.status === "deleted") {
		return;
	}

	const raw_url = "https://raw.githubusercontent.com";
	const sha = state.metadata.head.sha;
	const full_name = state.metadata.head.repo.full_name;
	const url = raw_url + "/" + full_name + "/" + sha + "/" + file.filename;
	state.head.content[index] = fetch(url).then(r => r.text()).then(text => text.split('\n'));
}

function fetchFileAtBase(state) {
	const index = state.index;
	const file = state.comparison.files[index];
	if (file.status === "added") {
		return;
	}

	const raw_url = "https://raw.githubusercontent.com";
	const sha = state.metadata.base.sha;
	const full_name = state.metadata.base.repo.full_name;
	const filename = file.status === "copied" || file.status === "renamed" ?
		file.previous_filename : file.filename;
	const url = raw_url + "/" + full_name + "/" + sha + "/" + filename;
	state.base.content[index] = fetch(url).then(r => r.text()).then(text => text.split('\n'));
}

async function init() {
	const params = new URLSearchParams(window.location.search);
	const range = params.get("range");
	const prId = params.get("pr");
	const repo = params.get("repo");

	document.title = "webrev - " + repo + "/" + prId + "/" + range;

	const metadata = await fetchMetadata(repo, prId, range);
	const comparison = await fetchComparison(repo, prId, range, metadata);

	state.metadata = metadata;
	state.comparison = comparison;
	state.commits = fetchCommits(repo, prId, range);

	const files = state.comparison.files;
	const raw_url = "https://raw.githubusercontent.com";

	state.head.content = new Array(files.length);
	state.head.content.fill(null);
	const num_files_to_prefetch = Math.min(files.length, 25);
	const head_sha = state.metadata.head.sha;
	const head_full_name = state.metadata.head.repo.full_name;
	for (let i = 0; i < num_files_to_prefetch; i++) {
		if (files[i].status === "deleted") {
			continue;
		} else {
			const url = raw_url + "/" + head_full_name + "/" + head_sha + "/" + files[i].filename;
			state.head.content[i] = fetch(url).then(r => r.text()).then(text => text.split('\n'));
		}
	}
	state.base.content = new Array(files.length);
	state.base.content.fill(null);
	const base_sha = state.metadata.base.sha;
	const base_full_name = state.metadata.base.repo.full_name;
	for (let i = 0; i < num_files_to_prefetch; i++) {
		const file = files[i];
		if (file.status === "added") {
			continue;
		} else {
			const filename = file.status === "copied" || file.status === "renamed" ?
				file.previous_filename : file.filename;
			const url = raw_url + "/" + base_full_name + "/" + base_sha + "/" + filename;
			state.base.content[i] = fetch(url).then(r => r.text()).then(text => text.split('\n'));
		}
	}

	state.cache.cdiffs = new Array(files.length);
	state.cache.cdiffs.fill(null);

	state.cache.udiffs = new Array(files.length);
	state.cache.udiffs.fill(null);

	state.cache.sdiffs = new Array(files.length);
	state.cache.sdiffs.fill(null);

	state.cache.frames = new Array(files.length);
	state.cache.frames.fill(null);

	state.cache.old = new Array(files.length);
	state.cache.old.fill(null);

	state.cache["new"] = new Array(files.length);
	state.cache["new"].fill(null);

	state.cache.patch = new Array(files.length);
	state.cache.patch.fill(null);
}

const setup = init();
window.onload = async function(e) {
	await setup;
	log("onload: fragment: " + window.location.hash);
	renderFromFragment(window.location.hash);
}
window.onpopstate = async function (e) {
	await setup;
	log("onpopstate: fragment: " + window.location.hash);
	renderFromFragment(window.location.hash);
}
