package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.dto.UserDTO.UserStatDTO;
import com.esewa.javabackend.mapper.UserStatMapper;
import com.esewa.javabackend.module.UserStats;
import com.esewa.javabackend.repository.JpaRepository.UserStatsRepository;
import com.esewa.javabackend.utils.AppConstants;
import com.esewa.javabackend.utils.AppUtil;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.UserStatSpecification;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@AllArgsConstructor
@Slf4j
public class UserStatService {

    private final UserStatsRepository userStatRepository;
    private final UserStatMapper userStatMapper;
    private final String className = UserStatService.class.getName();



    // Create / Update
    public Integer saveUserStat(UserStatDTO statDTO) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, statDTO);

        UserStats stat = Optional.ofNullable(statDTO.getId())
                .map(id -> userStatRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("UserStat not found")))
                .orElse(new UserStats());

        UserStats mapped = userStatMapper.toEntity(statDTO);
        mapped.setId(stat.getId());
        return userStatRepository.save(mapped).getId();
    }

    // Read
    public UserStatDTO getUserStatById(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        return userStatRepository.findById(id)
                .map(userStatMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("UserStat not found"));
    }

    // Delete
    public void deleteUserStat(Integer id) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, id);

        UserStats stat = userStatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserStat not found"));
        userStatRepository.delete(stat);
    }

    // Filter
    public PaginatedDtoResponse<UserStatDTO> getAllUserStats(SearchFilter filter) {
        log.info( className, AppUtil.getMethodName(), AppConstants.REQUEST, filter);
        PageRequest pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy())
        );

        Page<UserStats> stats = userStatRepository.findAll(UserStatSpecification.buildSpecification(filter), pageable);
        Page<UserStatDTO> dtoPage = stats.map(userStatMapper::toDTO);

        return PaginatedResHandler.getPaginatedData(dtoPage);
    }
}

