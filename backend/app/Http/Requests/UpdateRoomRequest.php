<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomRequest extends FormRequest
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
            'project_theme' => ['sometimes', 'string', 'max:255'],
            'roles' => ['sometimes', 'array', 'min:2'],
            'roles.*' => ['string', 'max:100'],
            'productivity_windows' => ['sometimes', 'array', 'min:1', 'max:2'],
            'productivity_windows.*' => ['in:morning,afternoon,evening,flexible'],
            'environments' => ['sometimes', 'array', 'min:1', 'max:2'],
            'environments.*' => ['in:private,public,online,flexible'],
            'max_members' => ['sometimes', 'integer', 'min:2', 'max:1000'],
            'max_per_group' => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'number_of_groups' => ['sometimes', 'integer', 'min:2', 'max:50'],
            'status' => ['sometimes', 'in:open,matching,ongoing'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->has('project_theme') || $this->has('name')) {
            $payload['project_theme'] = $this->input('project_theme', $this->input('name'));
        }

        if ($this->has('number_of_groups') || $this->has('numGroups')) {
            $payload['number_of_groups'] = (int) $this->input('number_of_groups', $this->input('numGroups'));
        }

        // "Max member room" = total capacity. max_per_group is derived in the
        // controller (after the room is loaded) so number_of_groups can fall back
        // to the room's existing value when not sent in this request.
        if ($this->has('max_members') || $this->has('maxMembers')) {
            $payload['max_members'] = (int) $this->input('max_members', $this->input('maxMembers'));
        } elseif ($this->has('max_per_group') || $this->has('maxPerGroup')) {
            // Legacy direct per-group update (e.g. admin tools).
            $payload['max_per_group'] = (int) $this->input('max_per_group', $this->input('maxPerGroup'));
        }

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
