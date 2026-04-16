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
            'roles' => ['required', 'array', 'min:2'],
            'roles.*' => ['string', 'max:100'],
            'productivity_windows' => ['sometimes', 'array', 'min:1', 'max:2'],
            'productivity_windows.*' => ['in:morning,afternoon,evening,flexible'],
            'environments' => ['sometimes', 'array', 'min:1', 'max:2'],
            'environments.*' => ['in:private,public,online,flexible'],
            'max_per_group' => ['required', 'integer', 'min:2', 'max:20'],
            'number_of_groups' => ['required', 'integer', 'min:2', 'max:50'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            // Accept frontend payload naming while keeping DB schema in snake_case.
            'project_theme' => $this->input('project_theme', $this->input('name')),
            'max_per_group' => $this->input('max_per_group', $this->input('maxPerGroup')),
            'number_of_groups' => $this->input('number_of_groups', $this->input('numGroups')),
        ];

        $productivityWindows = $this->input('productivity_windows', $this->input('productivityWindows'));
        if (is_string($productivityWindows)) {
            $productivityWindows = array_values(array_filter(array_map('trim', explode(',', $productivityWindows))));
        }
        if (is_array($productivityWindows) && $productivityWindows !== []) {
            $payload['productivity_windows'] = $productivityWindows;
        }

        $environments = $this->input('environments');
        if (is_string($environments)) {
            $environments = array_values(array_filter(array_map('trim', explode(',', $environments))));
        }
        if (is_array($environments) && $environments !== []) {
            $payload['environments'] = $environments;
        }

        $this->merge($payload);
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
