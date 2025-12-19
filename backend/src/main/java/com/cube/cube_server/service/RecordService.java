package com.cube.cube_server.service;

import com.cube.cube_server.domain.Member;
import com.cube.cube_server.domain.Record;
import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.repository.MemberRepository;
import com.cube.cube_server.repository.RecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RecordService {

    private final RecordRepository recordRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public Long addRecord(RecordDto.Create request, String memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Record record = request.toEntity();

        record.changeMember(member);

        recordRepository.save(record);
        return record.getId();
    }

    public List<RecordDto.Response> getRecords(String memberId) {
        return recordRepository.findByMemberId(memberId).stream()
                .map(RecordDto.Response::of)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteRecord(Long id) {
        recordRepository.deleteById(id);
    }
}