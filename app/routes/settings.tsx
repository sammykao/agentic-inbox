// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import {
	Badge,
	Button,
	Input,
	Loader,
	Switch,
	useKumoToastManager,
} from "@cloudflare/kumo";
import {
	ArrowCounterClockwiseIcon,
	RobotIcon,
	SignatureIcon,
} from "@phosphor-icons/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";

// Placeholder shown in the textarea when no custom prompt is set.
// The authoritative default prompt lives in workers/agent/index.ts (DEFAULT_SYSTEM_PROMPT).
const PROMPT_PLACEHOLDER = `You are an email assistant that helps manage this inbox. You read emails, draft replies, and help organize conversations.\n\nWrite like a real person. Short, direct, flowing prose. Plain text only.\n\n(Leave empty to use the full built-in default prompt)`;

export default function SettingsRoute() {
	const { mailboxId } = useParams<{ mailboxId: string }>();
	const toastManager = useKumoToastManager();
	const { data: mailbox } = useMailbox(mailboxId);
	const updateMailboxMutation = useUpdateMailbox();

	const [displayName, setDisplayName] = useState("");
	const [agentPrompt, setAgentPrompt] = useState("");
	const [signatureEnabled, setSignatureEnabled] = useState(false);
	const [signatureMarkdown, setSignatureMarkdown] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (mailbox) {
			setDisplayName(mailbox.settings?.fromName || mailbox.name || "");
			setAgentPrompt(mailbox.settings?.agentSystemPrompt || "");
			setSignatureEnabled(mailbox.settings?.signature?.enabled || false);
			setSignatureMarkdown(
				mailbox.settings?.signature?.markdown || mailbox.settings?.signature?.text || "",
			);
		}
	}, [mailbox]);

	const handleSave = async () => {
		if (!mailbox || !mailboxId) return;
		setIsSaving(true);
		const settings = {
			...mailbox.settings,
			fromName: displayName,
			agentSystemPrompt: agentPrompt.trim() || undefined,
			signature: {
				...mailbox.settings?.signature,
				enabled: signatureEnabled,
				text: signatureMarkdown,
				markdown: signatureMarkdown,
				html: undefined,
			},
		};
		try {
			await updateMailboxMutation.mutateAsync({ mailboxId, settings });
			toastManager.add({ title: "Settings saved!" });
		} catch {
			toastManager.add({
				title: "Failed to save settings",
				variant: "error",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleResetPrompt = () => {
		setAgentPrompt("");
	};

	if (!mailbox) {
		return (
			<div className="flex justify-center py-20">
				<Loader size="lg" />
			</div>
		);
	}

	const isCustomPrompt = agentPrompt.trim().length > 0;

	return (
		<div className="max-w-2xl px-4 py-4 md:px-8 md:py-6 h-full overflow-y-auto">
			<h1 className="text-lg font-semibold text-kumo-default mb-6">Settings</h1>

			<div className="space-y-6">
				{/* Account */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="text-sm font-medium text-kumo-default mb-4">
						Account
					</div>
					<div className="space-y-3">
						<Input
							label="Display Name"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
						/>
						<Input label="Email" type="email" value={mailbox.email} disabled />
					</div>
				</div>

				{/* Email Signature */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="flex items-start justify-between gap-4 mb-4">
						<div className="flex items-center gap-2">
							<SignatureIcon
								size={16}
								weight="duotone"
								className="text-kumo-subtle"
							/>
							<span className="text-sm font-medium text-kumo-default">
								Email Signature
							</span>
							{signatureEnabled ? (
								<Badge variant="primary">Enabled</Badge>
							) : (
								<Badge variant="secondary">Disabled</Badge>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs text-kumo-subtle">
							<span>
								{signatureEnabled
									? "Append to new messages"
									: "Keep hidden in compose"}
							</span>
							<Switch
								checked={signatureEnabled}
								onCheckedChange={setSignatureEnabled}
							/>
						</div>
					</div>
					<p className="text-xs text-kumo-subtle mb-3">
						Write your signature in Markdown. It supports paragraphs, links,
						bold, italic, inline code, and simple lists.
					</p>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-xs font-medium text-kumo-default mb-2">
								Markdown
							</div>
							<textarea
								value={signatureMarkdown}
								onChange={(e) => setSignatureMarkdown(e.target.value)}
								placeholder={`Best,\n**${displayName || mailbox.name}**\n[Website](https://example.com)`}
								rows={8}
								className="w-full resize-y rounded-lg border border-kumo-line bg-kumo-recessed px-3 py-2 text-sm text-kumo-default placeholder:text-kumo-subtle focus:outline-none focus:ring-1 focus:ring-kumo-ring font-mono leading-relaxed"
							/>
						</div>
						<div>
							<div className="text-xs font-medium text-kumo-default mb-2">
								Preview
							</div>
							<div className="min-h-[174px] rounded-lg border border-kumo-line bg-kumo-recessed px-4 py-3 text-sm text-kumo-default">
								{signatureMarkdown.trim() ? (
									<div className="border-t border-kumo-line pt-3 text-kumo-default [&_a]:text-kumo-link [&_a:hover]:text-kumo-link-hover [&_code]:rounded [&_code]:bg-kumo-fill [&_code]:px-1 [&_li]:my-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5">
										<Markdown remarkPlugins={[remarkGfm]}>
											{signatureMarkdown}
										</Markdown>
									</div>
								) : (
									<div className="flex h-full min-h-[140px] items-center justify-center text-center text-xs text-kumo-subtle">
										Your formatted signature preview will appear here.
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Agent System Prompt */}
				<div className="rounded-lg border border-kumo-line bg-kumo-base p-5">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<RobotIcon size={16} weight="duotone" className="text-kumo-subtle" />
							<span className="text-sm font-medium text-kumo-default">
								AI Agent Prompt
							</span>
							{isCustomPrompt ? (
								<Badge variant="primary">Custom</Badge>
							) : (
								<Badge variant="secondary">Default</Badge>
							)}
						</div>
						{isCustomPrompt && (
							<Button
								variant="ghost"
								size="xs"
								icon={<ArrowCounterClockwiseIcon size={14} />}
								onClick={handleResetPrompt}
							>
								Reset to default
							</Button>
						)}
					</div>
					<p className="text-xs text-kumo-subtle mb-3">
						Customize how the AI agent behaves for this mailbox.
						Leave empty to use the built-in default prompt.
					</p>
					<textarea
						value={agentPrompt}
						onChange={(e) => setAgentPrompt(e.target.value)}
						placeholder={PROMPT_PLACEHOLDER}
						rows={12}
						className="w-full resize-y rounded-lg border border-kumo-line bg-kumo-recessed px-3 py-2 text-xs text-kumo-default placeholder:text-kumo-subtle focus:outline-none focus:ring-1 focus:ring-kumo-ring font-mono leading-relaxed"
					/>
					<p className="text-xs text-kumo-subtle mt-2">
						The prompt is sent as the system message to the AI model.
						It controls the agent's personality, writing style, and behavior rules.
					</p>
				</div>

				{/* Save */}
				<div className="flex justify-end">
					<Button variant="primary" onClick={handleSave} loading={isSaving}>
						Save Changes
					</Button>
				</div>
			</div>
		</div>
	);
}
