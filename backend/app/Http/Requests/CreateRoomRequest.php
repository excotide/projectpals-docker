<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'project_theme' => ['required', 'string', 'max:255'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'max:100'],
            'productivity_windows' => ['required', 'array', 'min:1', 'max:2'],
            'productivity_windows.*' => ['in:morning,afternoon,evening,flexible'],
            'environments' => ['required', 'array', 'min:1', 'max:2'],
            'environments.*' => ['in:private,public,online,flexible'],
            'max_per_group' => ['required', 'integer', 'min:2', 'max:20'],
            'number_of_groups' => ['required', 'integer', 'min:1', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'productivity_windows.max' => 'You can select a maximum of 2 productivity windows.',
            'environments.max' => 'You can select a maximum of 2 environments.',
        ];
    }
}
