import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)


def generate_eco_recommendations(category, amount, co2e_value):
    """
    Calls the Groq API using the ultra-fast llama-3.1-8b-instant model
    to generate highly targeted, snappy reduction actions.
    """

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning("Groq API key missing from environment variables.")
        return ["Eco tips are resting right now. Check back shortly!"]
    
    client = Groq(api_key=api_key)

    # Engineering a strict system prompt forces the model to respond in a 
    # clean, consistent manner without generic AI conversational fluff.
    system_instruction = (
        "You are an elite, concise environmental coach for EcoTrack. "
        "Analyze the user's logged activity and provide exactly 2 bulleted suggestions "
        "to reduce this specific impact. Max 15 words per bullet. "
        "Do not include greeting text, conversational intros, or code formatting."
    )

    user_input = (
        f"The user just logged an activity in the '{category}' category "
        f"with a volume of {amount}. This generated {co2e_value} kg of CO2e."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2,
            max_tokens=120
        )

        raw_response = completion.choices[0].message.content

        # Parse the raw text response into a clean list of strings for DRF serialization
        suggestions = [
            line.strip("-*12. ")
            for line in raw_response.strip().split("\n")
            if line.strip()
        ]

        # Return exactly up to two items to keep the dashboard card layout clean
        return suggestions[:2]
    
    except Exception as e:
        # Prevent external network drops from taking down your presentation 
        logger.error(f"Error communicating with GROQ API: {str(e)}")
        return [
            f"Consider optimizing your {category} usage to lower this footprint.",
            "Set a new target goal in your premium dashboard to stay on track."
        ]