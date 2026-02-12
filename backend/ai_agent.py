import os
import json
from google import genai
from google.genai import types
from typing import TypedDict


class EvaluationResult(TypedDict):
    pass_: bool
    feedback: str


def evaluate_milestone(milestone: dict, student_answer: str) -> EvaluationResult:
    """
    milestone = {
        "question": "...",
        "expectedCriteria": "..."
    }
    """

    api_key = os.getenv("API_KEY")
    if not api_key:
        raise Exception("API Key is not configured. Evaluation unavailable.")

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are an expert AI teacher evaluating a student's answer for a Web3 course milestone.

Milestone Question:
"{milestone['question']}"

Expected Passing Criteria:
"{milestone['expectedCriteria']}"

Student's Answer:
"{student_answer}"

Evaluate if the student's answer meets the expected criteria to pass this milestone. 
Be constructive but firm. If they show a clear understanding of the core concept, pass them.
Provide brief feedback (1-3 sentences) explaining why they passed or failed.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "pass": {
                            "type": "boolean",
                            "description": "True if the student passed based on criteria, false otherwise."
                        },
                        "feedback": {
                            "type": "string",
                            "description": "Constructive feedback for the student."
                        }
                    },
                    "required": ["pass", "feedback"]
                }
            )
        )

        if not response.text:
            raise Exception("Empty response from AI")

        return json.loads(response.text)

    except Exception as e:
        print("Evaluation error:", e)
        raise Exception("Failed to evaluate milestone. Please try again later.")
