import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
  question_text: string
  options: string[]
  correct_answers: string[]
  points: number
}

interface QuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: Omit<Question, 'id'>) => void
  question?: Question
}

export function QuestionModal({ isOpen, onClose, onSave, question }: QuestionModalProps) {
  const [formData, setFormData] = useState<Omit<Question, 'id'>>({
    type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answers: [],
    points: 1
  })

  // Reset form data whenever the question prop changes
  useEffect(() => {
    if (question) {
      // Editing existing question - populate with question data
      setFormData({
        type: question.type,
        question_text: question.question_text,
        options: question.options,
        correct_answers: question.correct_answers,
        points: question.points
      })
    } else {
      // Adding new question - reset to default values
      setFormData({
        type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answers: [],
        points: 1
      })
    }
  }, [question])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.question_text.trim()) {
      alert('Please enter a question')
      return
    }

    if (formData.type === 'multiple_choice' && formData.options.some(opt => !opt.trim())) {
      alert('Please fill in all options')
      return
    }

    if (formData.correct_answers.length === 0) {
      alert('Please select at least one correct answer')
      return
    }

    onSave(formData)
    onClose()
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] })
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index)
      const newCorrectAnswers = formData.correct_answers.filter(answer => answer !== formData.options[index])
      setFormData({ 
        ...formData, 
        options: newOptions,
        correct_answers: newCorrectAnswers
      })
    }
  }

  const handleCorrectAnswerToggle = (option: string) => {
    const isSelected = formData.correct_answers.includes(option)
    let newCorrectAnswers: string[]

    if (formData.type === 'multiple_choice') {
      // For multiple choice, allow multiple correct answers
      if (isSelected) {
        newCorrectAnswers = formData.correct_answers.filter(answer => answer !== option)
      } else {
        newCorrectAnswers = [...formData.correct_answers, option]
      }
    } else {
      // For true/false, only one correct answer
      newCorrectAnswers = [option]
    }

    setFormData({ ...formData, correct_answers: newCorrectAnswers })
  }

  const handleTypeChange = (type: Question['type']) => {
    let newOptions: string[] = []
    let newCorrectAnswers: string[] = []

    if (type === 'true_false') {
      newOptions = ['True', 'False']
    } else if (type === 'multiple_choice') {
      newOptions = ['', '', '', '']
    }

    setFormData({
      ...formData,
      type,
      options: newOptions,
      correct_answers: newCorrectAnswers
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">
            {question ? 'Edit Question' : 'Add New Question'}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Question Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as Question['type'])}
              className="input w-full"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="input w-full h-24 resize-none"
              placeholder="Enter your question here..."
              required
            />
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Points
            </label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              className="input w-24"
              min="1"
              required
            />
          </div>

          {/* Options for Multiple Choice and True/False */}
          {(formData.type === 'multiple_choice' || formData.type === 'true_false') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-secondary-700">
                  Options
                </label>
                {formData.type === 'multiple_choice' && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.correct_answers.includes(option)}
                      onChange={() => handleCorrectAnswerToggle(option)}
                      className="rounded border-secondary-300 text-green-600 focus:ring-green-500"
                      disabled={formData.type === 'true_false' && !option.trim()}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="input flex-1"
                      placeholder={`Option ${index + 1}`}
                      disabled={formData.type === 'true_false'}
                      required={formData.type === 'multiple_choice'}
                    />
                    {formData.type === 'multiple_choice' && formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-secondary-500 mt-2">
                Check the box next to correct answer(s)
              </p>
            </div>
          )}

          {/* Correct Answer for Fill in the Blank and Short Answer */}
          {(formData.type === 'fill_blank' || formData.type === 'short_answer') && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Correct Answer(s) *
              </label>
              <textarea
                value={formData.correct_answers.join('\n')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  correct_answers: e.target.value.split('\n').filter(answer => answer.trim()) 
                })}
                className="input w-full h-20 resize-none"
                placeholder="Enter correct answers (one per line for multiple acceptable answers)"
                required
              />
              <p className="text-xs text-secondary-500 mt-1">
                For multiple acceptable answers, enter each on a new line
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-secondary-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2"
            >
              {question ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}