# CV transformation policy

Prompt version: `tailor-v2`  
Enforcement: application merge + validator. The model prompt is guidance, not the guarantee.

## Source of truth

The canonical source CV (extracted, ID-stamped) is the only evidence of the candidate. The job description is untrusted comparison material.

## Priority

1. Preserve source information.
2. Preserve factual integrity.
3. Improve job relevance.
4. Improve clarity and readability.
5. Improve brevity.

Never remove a fact to satisfy style, keywords, page count, or word count.

## The model may change

- Professional summary.
- Wording of experience and project bullets, when every material fact is evidenced.
- Order of existing skills and skill groups, without changing meaning.
- Section emphasis (not section deletion).

## The model must not change

These fields are copied from the source CV in application code after the model responds:

- Candidate name and all contact details.
- Employer names, job titles, employment dates, locations.
- Institution names, qualification names, education dates, locations.
- Every coursework item (verbatim).
- Certification names, issuers, dates.
- Project names, project dates, project URLs, project technologies.
- Language names and proficiency (if present).
- Any exact numeric metric from the source.
- Every experience / education / project / certification / skill-group entry.

## Evidence

Every rewritten bullet must cite one or more source bullet IDs. Combining source bullets is allowed only when all facts are kept and no unsupported relationship is added. If a rewrite is unsafe, keep the original text.

## Keywords

A job-description term may appear in the tailored CV only when the source already evidences the same concept. Unsupported terms go to `missingKeywords`, never into the CV.

## Scoring

Code calculates estimated job alignment. The model may classify keywords; it does not own the score. The score is not an ATS-pass guarantee.

## Failure

If preservation and optimization conflict, keep the source text. If validation still fails after deterministic restore and one targeted repair, fail the request and do not charge a credit.
