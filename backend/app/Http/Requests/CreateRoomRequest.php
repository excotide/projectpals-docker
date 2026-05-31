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
            'number_of_groups' => ['required', 'integer', 'min:2', 'max:50'],
            'max_members' => ['required', 'integer', 'min:2', 'max:1000', 'gte:number_of_groups'],
            'max_per_group' => ['required', 'integer', 'min:1', 'max:1000'],
            'create_room_only' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $numberOfGroups = (int) $this->input('number_of_groups', $this->input('numGroups', 0));

        // "Max member room" = total room capacity. Backward-compat: if only the legacy
        // per-group value was sent (e.g. admin dev tools), derive total from it.
        $maxMembers = $this->input('max_members', $this->input('maxMembers'));
        if ($maxMembers === null) {
            $legacyPerGroup = (int) $this->input('max_per_group', $this->input('maxPerGroup', 0));
            if ($legacyPerGroup > 0 && $numberOfGroups > 0) {
                $maxMembers = $legacyPerGroup * $numberOfGroups;
            }
        }
        $maxMembers = (int) $maxMembers;

        // Per-team size is derived from total capacity and team count.
        $maxPerGroup = ($numberOfGroups > 0 && $maxMembers > 0)
            ? (int) ceil($maxMembers / $numberOfGroups)
            : 0;

        $payload = [
            // Accept frontend payload naming while keeping DB schema in snake_case.
            'project_theme'    => $this->input('project_theme', $this->input('name')),
            'number_of_groups' => $numberOfGroups,
            'max_members'      => $maxMembers,
            'max_per_group'    => $maxPerGroup,
            'create_room_only' => filter_var($this->input('create_room_only', false), FILTER_VALIDATE_BOOL),
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
