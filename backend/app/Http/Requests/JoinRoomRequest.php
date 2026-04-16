<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JoinRoomRequest extends FormRequest
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
            'room_code' => ['required', 'string', 'max:10'],
            'primary_role' => ['nullable', 'string', 'max:100'],
            'backup_role' => ['nullable', 'string', 'max:100', 'different:primary_role'],
            'productivity_windows' => ['nullable', 'array', 'min:1', 'max:2'],
            'productivity_windows.*' => ['in:morning,afternoon,evening,flexible'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            'room_code' => $this->input('room_code', $this->input('roomCode')),
            'primary_role' => $this->input('primary_role', $this->input('primaryRole')),
            'backup_role' => $this->input('backup_role', $this->input('backupRole')),
        ];

        $productivityWindows = $this->input('productivity_windows', $this->input('productivityWindows'));
        if (is_string($productivityWindows)) {
            $productivityWindows = array_values(array_filter(array_map('trim', explode(',', $productivityWindows))));
        }
        if (is_array($productivityWindows) && $productivityWindows !== []) {
            $payload['productivity_windows'] = $productivityWindows;
        }

        $this->merge($payload);
    }
}
