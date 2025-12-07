export const GRADE_OPTIONS = [
	{ value: "pre-k", label: "Pre-K" },
	{ value: "kindergarten", label: "Kindergarten" },
	{ value: "1", label: "1st grade" },
	{ value: "2", label: "2nd grade" },
	{ value: "3", label: "3rd grade" },
	{ value: "4", label: "4th grade" },
	{ value: "5", label: "5th grade" },
	{ value: "6", label: "6th grade" },
	{ value: "7", label: "7th grade" },
	{ value: "8", label: "8th grade" },
	{ value: "9", label: "9th grade" },
	{ value: "10", label: "10th grade" },
	{ value: "11", label: "11th grade" },
	{ value: "12", label: "12th grade" },
] as const;

export type GradeValue = (typeof GRADE_OPTIONS)[number]["value"];

export const GRADE_LABEL_BY_VALUE: Record<GradeValue, string> =
	GRADE_OPTIONS.reduce((acc, option) => {
		acc[option.value] = option.label;
		return acc;
	}, {} as Record<GradeValue, string>);

export function formatGrade(grade?: string | null): string {
	if (!grade) return "";
	const normalized = grade.trim().toLowerCase();
	return GRADE_LABEL_BY_VALUE[normalized as GradeValue] || grade;
}
