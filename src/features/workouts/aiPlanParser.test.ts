import { describe, expect, it } from 'vitest'
import {
  GEMINI_EXAMPLE_OUTPUT,
  GEMINI_PROMPT_TEMPLATE,
  parseAiWorkoutPlan,
} from './aiPlanParser'

describe('Gemini AI Workout Plan Parser', () => {
  it('ships an actionable Gemini prompt template and example', () => {
    expect(GEMINI_PROMPT_TEMPLATE).toContain('# Upper / Lower Personalizzata')
    expect(GEMINI_EXAMPLE_OUTPUT).toContain('## Giorno:')
  })

  it('parses the structured Gemini Markdown output with rest, RIR, supersets, and notes', () => {
    const parsed = parseAiWorkoutPlan(GEMINI_EXAMPLE_OUTPUT)
    expect(parsed).not.toBeNull()
    expect(parsed?.planName).toBe('Scheda Spinta / Tirata / Gambe')
    expect(parsed?.workouts).toHaveLength(3)
    expect(parsed?.workouts[0].exercises[0]).toEqual({
      exercise_name: 'Panca Piana con Bilanciere',
      target_sets: '4',
      target_reps: '6-8',
      restSeconds: '150',
      rir: 'RIR 2',
      supersetGroup: '',
      note: 'Discesa controllata 2s',
    })
    expect(parsed?.workouts[0].exercises[2].supersetGroup).toBe('A')
    expect(parsed?.workouts[0].exercises[3].supersetGroup).toBe('A')
  })

  it('parses JSON fenced output and free-form Gemini bullet lists', () => {
    const jsonText = `Ecco la tua scheda:
\`\`\`json
{
  "planName": "Full Body AI",
  "workouts": [
    {
      "name": "Giorno A",
      "exercises": [
        { "exercise_name": "Squat", "target_sets": 4, "target_reps": "6", "restSeconds": 180, "rir": "RIR 2" }
      ]
    }
  ]
}
\`\`\``
    const fromJson = parseAiWorkoutPlan(jsonText)
    expect(fromJson?.planName).toBe('Full Body AI')
    expect(fromJson?.workouts[0].exercises[0].restSeconds).toBe('180')

    const looseText = `## Giorno 1: Upper
- Trazioni alla sbarra: 4x8, recupero 120s, RIR 2
- Curl manubri: 3x12, recupero 90s`
    const fromLoose = parseAiWorkoutPlan(looseText)
    expect(fromLoose?.workouts[0].exercises).toHaveLength(2)
    expect(fromLoose?.workouts[0].exercises[0].target_sets).toBe('4')
    expect(fromLoose?.workouts[0].exercises[0].restSeconds).toBe('120')

    expect(parseAiWorkoutPlan('Ciao! Dimmi pure i tuoi obiettivi.')).toBeNull()
  })
})
