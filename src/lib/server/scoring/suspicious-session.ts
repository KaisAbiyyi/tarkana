export type AnswerTimingSignal = {
	orderIndex: number;
	timeSpentSeconds: number;
	timeLimitSeconds: number;
	alreadyAnswered?: boolean;
};

export type SuspiciousSessionInput = {
	answers: readonly AnswerTimingSignal[];
	tabSwitchCount?: number;
	requestAnomalyFlags?: readonly string[];
	rankedMode?: boolean;
	graceSeconds?: number;
	minimumHumanSeconds?: number;
};

export type SuspiciousSessionResult = {
	isSuspicious: boolean;
	reasons: string[];
};

export function detectSuspiciousSession(input: SuspiciousSessionInput): SuspiciousSessionResult {
	const graceSeconds = input.graceSeconds ?? 2;
	const minimumHumanSeconds = input.minimumHumanSeconds ?? 0.4;
	const reasons = new Set<string>();
	let expectedOrder = 0;

	for (const answer of input.answers) {
		if (answer.timeSpentSeconds < 0) reasons.add('negative_time');
		if (answer.timeSpentSeconds > answer.timeLimitSeconds + graceSeconds)
			reasons.add('time_limit_exceeded');
		if (answer.timeSpentSeconds > 0 && answer.timeSpentSeconds < minimumHumanSeconds) {
			reasons.add('impossible_response_time');
		}
		if (answer.alreadyAnswered) reasons.add('duplicate_answer');
		if (input.rankedMode !== false && answer.orderIndex !== expectedOrder) {
			reasons.add('out_of_order_answer');
		}
		expectedOrder += 1;
	}

	if ((input.tabSwitchCount ?? 0) >= 5) reasons.add('excessive_tab_switching');
	for (const flag of input.requestAnomalyFlags ?? []) {
		if (flag.trim().length > 0) reasons.add(`request_${flag}`);
	}

	return {
		isSuspicious: reasons.size > 0,
		reasons: [...reasons]
	};
}
