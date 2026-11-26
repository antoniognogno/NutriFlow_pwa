'use client'

import { useParams } from 'react-router-dom'
import { ActiveWorkout } from '@/features/workouts/ActiveWorkout'

export default function WorkoutSessionPage() {
  const { workoutId = '' } = useParams()
  return <ActiveWorkout workoutId={workoutId} />
}
